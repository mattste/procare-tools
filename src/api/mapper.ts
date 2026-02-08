import { ActivityType } from "../types.js";
import type { Activity, Child, MealDetails } from "../types.js";
import type { ProcareDailyActivity, ProcareKid } from "./types.js";

const DIAPER_MAP: Record<string, "wet" | "dry" | "bm" | "wet+bm"> = {
  Wet: "wet",
  BM: "bm",
  "BM & Wet": "wet+bm",
  Dry: "dry",
};

const MEAL_TYPE_MAP: Record<string, MealDetails["mealType"]> = {
  Breakfast: "breakfast",
  Lunch: "lunch",
  Snack: "snack",
  "AM Snack": "snack",
  "PM Snack": "snack",
  Dinner: "dinner",
};

const MEAL_AMOUNT_MAP: Record<string, NonNullable<MealDetails["amount"]>> = {
  All: "all",
  Most: "most",
  Some: "some",
  None: "none",
};

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoFromDateTime(activityDate: string, hhmm?: string): string | undefined {
  if (!hhmm) return undefined;
  const time = hhmm.trim();
  if (!time) return undefined;
  return `${activityDate}T${time.length === 5 ? `${time}:00` : time}`;
}

export function mapProcareKid(raw: ProcareKid): Child {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    classroom: raw.current_section_name ?? "Unknown",
    dateOfBirth: raw.dob,
  };
}

export function mapProcareActivity(raw: ProcareDailyActivity): Activity[] {
  const childIds = raw.kid_ids.length > 0 ? raw.kid_ids : ["unknown-child"];

  return childIds.map((childId) => {
    switch (raw.activity_type) {
      case "bathroom_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.DIAPER,
          timestamp: raw.activity_time,
          details: {
            condition: DIAPER_MAP[raw.data?.sub_type ?? ""] ?? "wet",
          },
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      case "meal_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.MEAL,
          timestamp: raw.activity_time,
          details: {
            mealType: MEAL_TYPE_MAP[raw.data?.type ?? ""] ?? "snack",
            items: raw.data?.desc ? [raw.data.desc] : [],
            amount: raw.data?.quantity
              ? MEAL_AMOUNT_MAP[raw.data.quantity] ?? undefined
              : undefined,
          },
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      case "nap_activity": {
        const startTs = toIsoFromDateTime(raw.activity_date, raw.data?.start_time);
        const endTs = toIsoFromDateTime(raw.activity_date, raw.data?.end_time);
        return {
          id: raw.id,
          childId,
          type: ActivityType.NAP,
          timestamp: startTs ?? raw.activity_time,
          endTime: endTs,
          details: {},
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      }
      case "bottle_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.BOTTLE,
          timestamp: raw.activity_time,
          details: {
            amount: parseNumber(raw.data?.amount) ?? 0,
            bottleConsumed: parseNumber(raw.data?.bottle_consumed),
          },
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      case "sign_in_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.CHECK_IN,
          timestamp:
            raw.activiable?.sign_in_time ??
            raw.activity_time,
          details: {
            section: raw.activiable?.section?.name,
          },
          notes: raw.comment || undefined,
          reportedBy: raw.activiable?.signed_in_by ?? raw.staff_present_name,
        };
      case "sign_out_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.CHECK_OUT,
          timestamp:
            raw.activiable?.sign_out_time ??
            raw.activity_time,
          details: {
            section: raw.activiable?.section?.name,
          },
          notes: raw.comment || undefined,
          reportedBy: raw.activiable?.signed_out_by ?? raw.staff_present_name,
        };
      case "learning_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.LEARNING,
          timestamp: raw.activity_time,
          details: {
            activityName: raw.activiable?.learning_activity_name?.value ?? "Unknown",
            categories:
              raw.activiable?.learning_activity_categories
                ?.map((category) => category.value)
                .filter((value): value is string => Boolean(value)) ?? [],
            photoUrl: raw.photo_url ?? undefined,
          },
          notes: raw.comment || raw.data?.desc || undefined,
          reportedBy: raw.staff_present_name,
        };
      case "note_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.NOTE,
          timestamp: raw.activity_time,
          details: {},
          notes: raw.data?.desc || raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      case "mood_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.MOOD,
          timestamp: raw.activity_time,
          details: {
            mood: raw.data?.type,
          },
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      case "incident_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.INCIDENT,
          timestamp: raw.activity_time,
          details: {
            description: raw.data?.desc ?? "",
            action: "",
          },
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      case "photo_activity":
        return {
          id: raw.id,
          childId,
          type: ActivityType.PHOTO,
          timestamp: raw.activity_time,
          details: {
            photoUrl: raw.photo_url,
          },
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
      default:
        return {
          id: raw.id,
          childId,
          type: ActivityType.NOTE,
          timestamp: raw.activity_time,
          details: {
            procareActivityType: raw.activity_type,
            data: raw.data,
          },
          notes: raw.comment || undefined,
          reportedBy: raw.staff_present_name,
        };
    }
  });
}
