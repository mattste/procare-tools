import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { SqliteDataProvider } from "./sqlite.js";
import { createTestProvider } from "../test/helpers/test-db.js";
import {
  CHILD_EMMA,
  CHILD_LIAM,
  emmaFullDay,
  liamPartialDay,
} from "../test/fixtures/sample-data.js";
import { ActivityType } from "../types.js";
import type { Activity, Child } from "../types.js";

describe("SqliteDataProvider", () => {
  let provider: SqliteDataProvider;

  afterEach(() => {
    provider?.close();
  });

  describe("children", () => {
    test("getChildren returns empty array when no children exist", async () => {
      provider = createTestProvider();
      const children = await provider.getChildren();
      expect(children).toEqual([]);
    });

    test("upsertChild inserts and retrieves a child", async () => {
      provider = createTestProvider();
      await provider.upsertChild(CHILD_EMMA);

      const children = await provider.getChildren();
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(CHILD_EMMA);
    });

    test("upsertChild updates existing child", async () => {
      provider = createTestProvider([CHILD_EMMA]);
      const updated: Child = { ...CHILD_EMMA, classroom: "Sunflowers" };
      await provider.upsertChild(updated);

      const child = await provider.getChild(CHILD_EMMA.id);
      expect(child?.classroom).toBe("Sunflowers");
    });

    test("getChild returns null for unknown id", async () => {
      provider = createTestProvider([CHILD_EMMA]);
      const child = await provider.getChild("nonexistent");
      expect(child).toBeNull();
    });

    test("getChildren returns multiple children", async () => {
      provider = createTestProvider([CHILD_EMMA, CHILD_LIAM]);
      const children = await provider.getChildren();
      expect(children).toHaveLength(2);
    });
  });

  describe("activities", () => {
    beforeEach(() => {
      provider = createTestProvider(
        [CHILD_EMMA, CHILD_LIAM],
        [...emmaFullDay(), ...liamPartialDay()],
      );
    });

    test("getActivities returns all activities for a child", async () => {
      const activities = await provider.getActivities(CHILD_EMMA.id);
      expect(activities).toHaveLength(10);
    });

    test("getActivities filters by date", async () => {
      const activities = await provider.getActivities(
        CHILD_EMMA.id,
        "2025-01-15",
      );
      expect(activities).toHaveLength(10);

      const empty = await provider.getActivities(
        CHILD_EMMA.id,
        "2025-01-16",
      );
      expect(empty).toHaveLength(0);
    });

    test("getActivities filters by type", async () => {
      const diapers = await provider.getActivities(
        CHILD_EMMA.id,
        undefined,
        ActivityType.DIAPER,
      );
      expect(diapers).toHaveLength(3);
      for (const d of diapers) {
        expect(d.type).toBe(ActivityType.DIAPER);
      }
    });

    test("getActivities filters by date and type", async () => {
      const meals = await provider.getActivities(
        CHILD_EMMA.id,
        "2025-01-15",
        ActivityType.MEAL,
      );
      expect(meals).toHaveLength(3);
    });

    test("getActivities returns results ordered by timestamp desc", async () => {
      const activities = await provider.getActivities(CHILD_EMMA.id);
      for (let i = 1; i < activities.length; i++) {
        expect(activities[i - 1].timestamp >= activities[i].timestamp).toBe(
          true,
        );
      }
    });

    test("getActivities isolates children", async () => {
      const emmaActivities = await provider.getActivities(CHILD_EMMA.id);
      const liamActivities = await provider.getActivities(CHILD_LIAM.id);
      expect(emmaActivities).toHaveLength(10);
      expect(liamActivities).toHaveLength(3);
    });
  });

  describe("getLatestActivity", () => {
    beforeEach(() => {
      provider = createTestProvider([CHILD_EMMA], emmaFullDay());
    });

    test("returns most recent activity of given type", async () => {
      const latest = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.DIAPER,
      );
      expect(latest).not.toBeNull();
      expect(latest!.timestamp).toBe("2025-01-15T13:30:00");
      expect(latest!.details).toEqual({ condition: "wet" });
    });

    test("returns null when no matching activity exists", async () => {
      const latest = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.INCIDENT,
      );
      expect(latest).toBeNull();
    });

    test("returns latest meal", async () => {
      const latest = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.MEAL,
      );
      expect(latest).not.toBeNull();
      expect(latest!.timestamp).toBe("2025-01-15T15:00:00");
      expect((latest!.details as any).mealType).toBe("snack");
    });
  });

  describe("getActivitiesInRange", () => {
    test("returns activities within date range", async () => {
      const day1 = emmaFullDay("2025-01-15");
      const day2 = emmaFullDay("2025-01-16");
      provider = createTestProvider([CHILD_EMMA], [...day1, ...day2]);

      const activities = await provider.getActivitiesInRange(
        CHILD_EMMA.id,
        "2025-01-15",
        "2025-01-16",
      );
      expect(activities).toHaveLength(20);
    });

    test("filters by type within range", async () => {
      const day1 = emmaFullDay("2025-01-15");
      const day2 = emmaFullDay("2025-01-16");
      provider = createTestProvider([CHILD_EMMA], [...day1, ...day2]);

      const diapers = await provider.getActivitiesInRange(
        CHILD_EMMA.id,
        "2025-01-15",
        "2025-01-16",
        ActivityType.DIAPER,
      );
      expect(diapers).toHaveLength(6); // 3 per day
    });

    test("returns empty for range with no data", async () => {
      provider = createTestProvider([CHILD_EMMA], emmaFullDay("2025-01-15"));
      const activities = await provider.getActivitiesInRange(
        CHILD_EMMA.id,
        "2025-02-01",
        "2025-02-28",
      );
      expect(activities).toHaveLength(0);
    });
  });

  describe("addActivities batch", () => {
    test("inserts multiple activities atomically", async () => {
      provider = createTestProvider([CHILD_EMMA]);
      const activities = emmaFullDay();
      await provider.addActivities(activities);

      const stored = await provider.getActivities(CHILD_EMMA.id);
      expect(stored).toHaveLength(activities.length);
    });
  });

  describe("sync metadata", () => {
    test("stores and retrieves sync metadata values", async () => {
      provider = createTestProvider();

      await provider.setSyncMetadata("last_sync_kid-1", "2026-02-07");
      const value = await provider.getSyncMetadata("last_sync_kid-1");

      expect(value).toBe("2026-02-07");
    });
  });

  describe("idempotent activity upsert", () => {
    test("upserts duplicate activity ids instead of inserting duplicates", async () => {
      provider = createTestProvider([CHILD_EMMA]);

      await provider.addActivity({
        id: "same-id",
        childId: CHILD_EMMA.id,
        type: ActivityType.NOTE,
        timestamp: "2025-01-15T09:00:00",
        details: {},
        notes: "first",
      });

      await provider.addActivity({
        id: "same-id",
        childId: CHILD_EMMA.id,
        type: ActivityType.NOTE,
        timestamp: "2025-01-15T09:05:00",
        details: {},
        notes: "updated",
      });

      const notes = await provider.getActivities(
        CHILD_EMMA.id,
        "2025-01-15",
        ActivityType.NOTE,
      );

      expect(notes).toHaveLength(1);
      expect(notes[0].notes).toBe("updated");
      expect(notes[0].timestamp).toBe("2025-01-15T09:05:00");
    });
  });

  describe("activity details roundtrip", () => {
    test("preserves diaper details through JSON serialization", async () => {
      provider = createTestProvider([CHILD_EMMA]);
      const activity: Activity = {
        id: "diaper-test",
        childId: CHILD_EMMA.id,
        type: ActivityType.DIAPER,
        timestamp: "2025-01-15T09:00:00",
        details: { condition: "wet+bm" },
      };
      await provider.addActivity(activity);

      const retrieved = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.DIAPER,
      );
      expect(retrieved!.details).toEqual({ condition: "wet+bm" });
    });

    test("preserves meal details through JSON serialization", async () => {
      provider = createTestProvider([CHILD_EMMA]);
      const activity: Activity = {
        id: "meal-test",
        childId: CHILD_EMMA.id,
        type: ActivityType.MEAL,
        timestamp: "2025-01-15T12:00:00",
        details: {
          mealType: "lunch",
          items: ["pasta", "broccoli", "milk"],
          amount: "most",
        },
      };
      await provider.addActivity(activity);

      const retrieved = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.MEAL,
      );
      expect((retrieved!.details as any).items).toEqual([
        "pasta",
        "broccoli",
        "milk",
      ]);
    });

    test("preserves nap details with endTime", async () => {
      provider = createTestProvider([CHILD_EMMA]);
      const activity: Activity = {
        id: "nap-test",
        childId: CHILD_EMMA.id,
        type: ActivityType.NAP,
        timestamp: "2025-01-15T10:00:00",
        endTime: "2025-01-15T11:30:00",
        details: { duration: 90 },
      };
      await provider.addActivity(activity);

      const retrieved = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.NAP,
      );
      expect(retrieved!.endTime).toBe("2025-01-15T11:30:00");
      expect((retrieved!.details as any).duration).toBe(90);
    });
  });
});
