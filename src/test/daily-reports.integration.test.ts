import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createTestProvider } from "./helpers/test-db.js";
import {
  CHILD_EMMA,
  CHILD_LIAM,
  emmaFullDay,
  liamPartialDay,
} from "./fixtures/sample-data.js";
import { ActivityType } from "../types.js";
import type { SqliteDataProvider } from "../provider/sqlite.js";
import type { DataProvider } from "../provider/interface.js";

/**
 * Integration tests that exercise the full daily-report retrieval flow
 * through the DataProvider interface. These tests verify that data can be
 * ingested, stored in SQLite, and queried back as coherent daily summaries.
 *
 * The provider variable is typed as DataProvider to ensure we only use
 * the abstract interface — any backing implementation should pass these.
 */
describe("Daily report retrieval (integration)", () => {
  let provider: DataProvider & { close(): void };

  beforeEach(() => {
    provider = createTestProvider(
      [CHILD_EMMA, CHILD_LIAM],
      [...emmaFullDay(), ...liamPartialDay()],
    );
  });

  afterEach(() => {
    provider.close();
  });

  describe("getDailySummary", () => {
    test("returns a complete daily summary for a child", async () => {
      const summary = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-01-15",
      );

      expect(summary.childId).toBe(CHILD_EMMA.id);
      expect(summary.date).toBe("2025-01-15");
      expect(summary.checkIn).toBe("2025-01-15T08:05:00");
      expect(summary.checkOut).toBe("2025-01-15T17:15:00");
      expect(summary.diaperCount).toBe(3);
      expect(summary.naps).toHaveLength(1);
      expect(summary.meals).toHaveLength(3);
      expect(summary.activities).toHaveLength(10);
    });

    test("summary activities are in chronological order", async () => {
      const summary = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-01-15",
      );

      for (let i = 1; i < summary.activities.length; i++) {
        const prev = new Date(summary.activities[i - 1].timestamp).getTime();
        const curr = new Date(summary.activities[i].timestamp).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    test("summary collects notes from all activities", async () => {
      const summary = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-01-15",
      );

      expect(summary.notes.length).toBeGreaterThan(0);
      expect(
        summary.notes.some((n) => n.includes("blocks")),
      ).toBe(true);
    });

    test("summary for a day with no data returns empty collections", async () => {
      const summary = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-02-01",
      );

      expect(summary.activities).toHaveLength(0);
      expect(summary.diaperCount).toBe(0);
      expect(summary.naps).toHaveLength(0);
      expect(summary.meals).toHaveLength(0);
      expect(summary.checkIn).toBeUndefined();
      expect(summary.checkOut).toBeUndefined();
    });

    test("summary correctly isolates data between children", async () => {
      const emmaSummary = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-01-15",
      );
      const liamSummary = await provider.getDailySummary(
        CHILD_LIAM.id,
        "2025-01-15",
      );

      expect(emmaSummary.activities).toHaveLength(10);
      expect(liamSummary.activities).toHaveLength(3);
      expect(emmaSummary.diaperCount).toBe(3);
      expect(liamSummary.diaperCount).toBe(1);
    });
  });

  describe("common parent queries via DataProvider interface", () => {
    test("when did my child's diaper last get changed?", async () => {
      const latest = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.DIAPER,
      );

      expect(latest).not.toBeNull();
      expect(latest!.type).toBe(ActivityType.DIAPER);
      expect(latest!.timestamp).toBe("2025-01-15T13:30:00");
    });

    test("when did they last eat?", async () => {
      const latest = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.MEAL,
      );

      expect(latest).not.toBeNull();
      expect(latest!.type).toBe(ActivityType.MEAL);
      expect(latest!.timestamp).toBe("2025-01-15T15:00:00");
    });

    test("how many diapers today?", async () => {
      const diapers = await provider.getActivities(
        CHILD_EMMA.id,
        "2025-01-15",
        ActivityType.DIAPER,
      );

      expect(diapers).toHaveLength(3);
    });

    test("what time did they check in?", async () => {
      const checkIn = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.CHECK_IN,
      );

      expect(checkIn).not.toBeNull();
      expect(checkIn!.timestamp).toBe("2025-01-15T08:05:00");
    });

    test("how long was their nap?", async () => {
      const nap = await provider.getLatestActivity(
        CHILD_EMMA.id,
        ActivityType.NAP,
      );

      expect(nap).not.toBeNull();
      expect((nap!.details as any).duration).toBe(75);
      expect(nap!.endTime).toBe("2025-01-15T11:15:00");
    });

    test("what did they eat for lunch?", async () => {
      const meals = await provider.getActivities(
        CHILD_EMMA.id,
        "2025-01-15",
        ActivityType.MEAL,
      );
      const lunch = meals.find((m) => (m.details as any).mealType === "lunch");

      expect(lunch).toBeDefined();
      expect((lunch!.details as any).items).toEqual([
        "chicken",
        "rice",
        "peas",
      ]);
      expect((lunch!.details as any).amount).toBe("most");
    });
  });

  describe("multi-day data retrieval", () => {
    test("getActivitiesInRange spans multiple days", async () => {
      // Add a second day of data
      const day2 = emmaFullDay("2025-01-16");
      for (const activity of day2) {
        await provider.addActivity(activity);
      }

      const allActivities = await provider.getActivitiesInRange(
        CHILD_EMMA.id,
        "2025-01-15",
        "2025-01-16",
      );
      expect(allActivities).toHaveLength(20);

      const diapersOnly = await provider.getActivitiesInRange(
        CHILD_EMMA.id,
        "2025-01-15",
        "2025-01-16",
        ActivityType.DIAPER,
      );
      expect(diapersOnly).toHaveLength(6);
    });

    test("daily summaries are independent per day", async () => {
      const day2 = emmaFullDay("2025-01-16");
      for (const activity of day2) {
        await provider.addActivity(activity);
      }

      const summary1 = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-01-15",
      );
      const summary2 = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-01-16",
      );

      expect(summary1.activities).toHaveLength(10);
      expect(summary2.activities).toHaveLength(10);
      // Each day has its own check-in time
      expect(summary1.checkIn).toContain("2025-01-15");
      expect(summary2.checkIn).toContain("2025-01-16");
    });
  });

  describe("data ingestion flow", () => {
    test("ingest children then activities, query back summaries", async () => {
      // Start fresh
      provider.close();
      provider = createTestProvider();

      // Step 1: Register children (simulates initial setup)
      await provider.upsertChild(CHILD_EMMA);
      await provider.upsertChild(CHILD_LIAM);

      const children = await provider.getChildren();
      expect(children).toHaveLength(2);

      // Step 2: Ingest a day's activities (simulates parsing a daily report)
      await provider.addActivities(emmaFullDay());
      await provider.addActivities(liamPartialDay());

      // Step 3: Query back — this is the path the procare-query skill takes
      const summary = await provider.getDailySummary(
        CHILD_EMMA.id,
        "2025-01-15",
      );
      expect(summary.diaperCount).toBe(3);
      expect(summary.meals).toHaveLength(3);
      expect(summary.naps).toHaveLength(1);
    });
  });
});
