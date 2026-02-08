import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { authenticateProcare } from "./auth.js";
import { ProcareApiClient } from "./client.js";
import {
  createProcareFixtureHarness,
  getRecordedDailyActivitiesKidId,
  hasProcareRecording,
} from "../test/network/procare-fixtures.js";

const recordingName = "procare-api-client-recorded-fixtures";
const fixtureMode = process.env.PROCARE_FIXTURE_MODE === "record" ? "record" : "replay";
const hasRecording = hasProcareRecording(recordingName);
const requireRecording = process.env.PROCARE_REQUIRE_RECORDING === "1";
const skipReplay = fixtureMode === "replay" && !hasRecording && !requireRecording;

let harness: Awaited<ReturnType<typeof createProcareFixtureHarness>> | undefined;

beforeAll(async () => {
  if (fixtureMode === "replay" && !hasRecording && requireRecording) {
    throw new Error(
      "Missing local Procare recording. Run: bun run fixtures:record (recordings are stored in .procare-recordings/procare)",
    );
  }

  if (skipReplay) {
    return;
  }

  harness = await createProcareFixtureHarness(recordingName);
});

afterAll(async () => {
  if (harness) {
    await harness.stop();
  }
});

describe("ProcareApiClient recorded fixtures", () => {
  test("records/replays kids + daily activities and validates request shape", async () => {
    if (skipReplay) {
      return;
    }

    if (!harness) {
      throw new Error("Fixture harness was not initialized.");
    }

    let authToken = process.env.PROCARE_AUTH_TOKEN ?? "fixture-token";

    if (harness.mode === "record") {
      const email = process.env.PROCARE_AUTHENTICATION_EMAIL;
      const password = process.env.PROCARE_AUTHENTICATION_PASSWORD;
      if (!email || !password) {
        throw new Error(
          "Missing PROCARE_AUTHENTICATION_EMAIL/PROCARE_AUTHENTICATION_PASSWORD for record mode",
        );
      }

      const auth = await authenticateProcare({
        email,
        password,
        fetchImpl: harness.fetchImpl,
      });
      authToken = auth.authToken;
    }

    const client = new ProcareApiClient({
      authToken,
      fetchImpl: harness.fetchImpl,
      minRequestIntervalMs: harness.mode === "record" ? 4000 : 0,
    });

    const kidsResponse = await client.getKids();
    expect(Array.isArray(kidsResponse.kids)).toBe(true);

    if (kidsResponse.kids.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const replayKidId =
        harness.mode === "replay"
          ? getRecordedDailyActivitiesKidId(recordingName)
          : null;

      const activitiesResponse = await client.getDailyActivities({
        kidId: replayKidId ?? kidsResponse.kids[0].id,
        dateTo: today,
        page: 1,
      });

      expect(Array.isArray(activitiesResponse.daily_activities)).toBe(true);
      expect(activitiesResponse.page).toBe(1);
    }

    const kidsRequest = harness.requests.find((request) =>
      request.url.includes("/parent/kids/"),
    );
    expect(kidsRequest).toBeDefined();
    expect(kidsRequest!.method).toBe("GET");

    const dailyRequest = harness.requests.find((request) =>
      request.url.includes("/parent/daily_activities/"),
    );

    if (dailyRequest) {
      const url = new URL(dailyRequest.url);
      expect(url.searchParams.get("kid_id")).toBeTruthy();
      expect(url.searchParams.get("filters[daily_activity][date_to]")).toBeTruthy();
      expect(url.searchParams.get("page")).toBe("1");
    }
  }, 45000);
});
