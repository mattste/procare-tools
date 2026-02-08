import { describe, expect, test } from "bun:test";
import { SyncEngine } from "./engine.js";
import { createTestProvider } from "../test/helpers/test-db.js";
import { ActivityType } from "../types.js";
import type { ProcareDailyActivity, ProcareKid } from "../api/types.js";

class MockApiClient {
  constructor(
    private kids: ProcareKid[],
    private activitiesByKid: Record<string, ProcareDailyActivity[]>,
  ) {}

  async getKids() {
    return { kids: this.kids };
  }

  async getAllDailyActivities(kidId: string): Promise<ProcareDailyActivity[]> {
    return this.activitiesByKid[kidId] ?? [];
  }
}

function activity(
  id: string,
  kidId: string,
  date: string,
  activityType = "meal_activity",
): ProcareDailyActivity {
  return {
    id,
    activity_type: activityType,
    activity_time: `${date}T12:00:00.000-08:00`,
    activity_date: date,
    data: { type: "Lunch", quantity: "Most", desc: "Pasta" },
    kid_ids: [kidId],
  };
}

describe("SyncEngine", () => {
  test("syncAll upserts kids, writes activities, and updates metadata", async () => {
    const kid = {
      id: "kid-1",
      first_name: "Orla",
      last_name: "Stewart",
      dob: "2025-05-21",
      current_section_name: "Infants",
    };

    const apiClient = new MockApiClient([kid], {
      "kid-1": [activity("act-1", "kid-1", "2026-02-06")],
    });

    const provider = createTestProvider();
    const engine = new SyncEngine({
      apiClient: apiClient as any,
      provider,
      now: () => new Date("2026-02-07T10:00:00.000Z"),
    });

    const result = await engine.syncAll();

    expect(result.syncedChildren).toBe(1);
    expect(result.syncedActivities).toBe(1);

    const children = await provider.getChildren();
    expect(children).toHaveLength(1);
    expect(children[0].firstName).toBe("Orla");

    const activities = await provider.getActivities("kid-1");
    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe(ActivityType.MEAL);

    expect(await provider.getSyncMetadata("last_sync_kid-1")).toBe("2026-02-07");
    expect(await provider.getSyncMetadata("last_sync_time")).toBe(
      "2026-02-07T10:00:00.000Z",
    );

    provider.close();
  });

  test("syncKid uses metadata date and remains idempotent", async () => {
    const kid = {
      id: "kid-1",
      first_name: "Orla",
      last_name: "Stewart",
      dob: "2025-05-21",
      current_section_name: "Infants",
    };

    const apiClient = new MockApiClient([kid], {
      "kid-1": [
        activity("act-old", "kid-1", "2026-02-02"),
        activity("act-new", "kid-1", "2026-02-06"),
      ],
    });

    const provider = createTestProvider();
    await provider.upsertChild({
      id: "kid-1",
      firstName: "Orla",
      lastName: "Stewart",
      classroom: "Infants",
      dateOfBirth: "2025-05-21",
    });
    await provider.setSyncMetadata("last_sync_kid-1", "2026-02-05");

    const engine = new SyncEngine({
      apiClient: apiClient as any,
      provider,
      now: () => new Date("2026-02-07T10:00:00.000Z"),
    });

    const firstRun = await engine.syncKid("kid-1");
    const secondRun = await engine.syncKid("kid-1", "2026-02-05");

    expect(firstRun.storedActivities).toBe(1);
    expect(secondRun.storedActivities).toBe(1);

    const activities = await provider.getActivities("kid-1");
    expect(activities).toHaveLength(1);
    expect(activities[0].id).toBe("act-new");

    provider.close();
  });
});
