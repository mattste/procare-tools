import { describe, expect, test } from "bun:test";
import { mapProcareActivity, mapProcareKid } from "./mapper.js";
import { ActivityType } from "../types.js";
import type { ProcareDailyActivity, ProcareKid } from "./types.js";

const baseActivity = {
  id: "act-1",
  activity_time: "2026-02-06T14:20:26.000-08:00",
  activity_date: "2026-02-06",
  kid_ids: ["kid-1"],
} satisfies Partial<ProcareDailyActivity>;

function withBase(partial: Partial<ProcareDailyActivity>): ProcareDailyActivity {
  return {
    ...baseActivity,
    activity_type: "note_activity",
    ...partial,
  } as ProcareDailyActivity;
}

describe("mapProcareKid", () => {
  test("maps kid fields", () => {
    const raw: ProcareKid = {
      id: "kid-1",
      first_name: "Orla",
      last_name: "Stewart",
      dob: "2025-05-21",
      current_section_name: "Infants",
    };

    expect(mapProcareKid(raw)).toEqual({
      id: "kid-1",
      firstName: "Orla",
      lastName: "Stewart",
      classroom: "Infants",
      dateOfBirth: "2025-05-21",
    });
  });
});

describe("mapProcareActivity", () => {
  test("maps bathroom subtypes", () => {
    const mapped = mapProcareActivity(
      withBase({
        activity_type: "bathroom_activity",
        data: { sub_type: "BM & Wet" },
      }),
    );

    expect(mapped[0].type).toBe(ActivityType.DIAPER);
    expect(mapped[0].details).toEqual({ condition: "wet+bm" });
  });

  test("maps meal fields", () => {
    const mapped = mapProcareActivity(
      withBase({
        activity_type: "meal_activity",
        data: { type: "Lunch", quantity: "Most", desc: "Chicken and rice" },
      }),
    );

    expect(mapped[0].type).toBe(ActivityType.MEAL);
    expect(mapped[0].details).toEqual({
      mealType: "lunch",
      items: ["Chicken and rice"],
      amount: "most",
    });
  });

  test("maps nap with start and end", () => {
    const mapped = mapProcareActivity(
      withBase({
        activity_type: "nap_activity",
        data: { start_time: "10:00", end_time: "11:30" },
      }),
    );

    expect(mapped[0].type).toBe(ActivityType.NAP);
    expect(mapped[0].timestamp).toBe("2026-02-06T10:00:00");
    expect(mapped[0].endTime).toBe("2026-02-06T11:30:00");
  });

  test("maps bottle parsing numbers", () => {
    const mapped = mapProcareActivity(
      withBase({
        activity_type: "bottle_activity",
        data: { amount: "2.5", bottle_consumed: "2" },
      }),
    );

    expect(mapped[0].type).toBe(ActivityType.BOTTLE);
    expect(mapped[0].details).toEqual({ amount: 2.5, bottleConsumed: 2 });
  });

  test("maps learning details", () => {
    const mapped = mapProcareActivity(
      withBase({
        activity_type: "learning_activity",
        comment: "Great participation",
        photo_url: "https://example.com/photo.jpg",
        activiable: {
          learning_activity_name: { value: "Circle Time" },
          learning_activity_categories: [
            { value: "Language" },
            { value: "Social" },
          ],
        },
      }),
    );

    expect(mapped[0].type).toBe(ActivityType.LEARNING);
    expect(mapped[0].details).toEqual({
      activityName: "Circle Time",
      categories: ["Language", "Social"],
      photoUrl: "https://example.com/photo.jpg",
    });
  });

  test("maps note description into notes", () => {
    const mapped = mapProcareActivity(
      withBase({
        activity_type: "note_activity",
        data: { desc: "Had a great day" },
      }),
    );

    expect(mapped[0].type).toBe(ActivityType.NOTE);
    expect(mapped[0].notes).toBe("Had a great day");
  });

  test("emits one activity per kid id", () => {
    const mapped = mapProcareActivity(
      withBase({
        kid_ids: ["kid-1", "kid-2"],
        activity_type: "note_activity",
      }),
    );

    expect(mapped).toHaveLength(2);
    expect(mapped[0].childId).toBe("kid-1");
    expect(mapped[1].childId).toBe("kid-2");
  });
});
