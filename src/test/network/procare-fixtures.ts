import { Polly } from "@pollyjs/core";
import FetchAdapter from "@pollyjs/adapter-fetch";
import FSPersister from "@pollyjs/persister-fs";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let registered = false;

function registerPolly(): void {
  if (registered) return;
  Polly.register(FetchAdapter as any);
  Polly.register(FSPersister as any);
  registered = true;
}

export type FixtureMode = "record" | "replay";

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ProcareFixtureHarness {
  mode: FixtureMode;
  hasRecordings: boolean;
  requests: RecordedRequest[];
  fetchImpl: typeof fetch;
  stop: () => Promise<void>;
}

function normalizeHeaders(input: unknown): Record<string, string> {
  if (!input) return {};
  if (input instanceof Headers) {
    return Object.fromEntries(input.entries());
  }
  if (Array.isArray(input)) {
    return Object.fromEntries(input.map(([k, v]) => [k, String(v)]));
  }
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}

function recordingsDir(): string {
  return (
    process.env.PROCARE_RECORDINGS_DIR ??
    join(process.cwd(), ".procare-recordings", "procare")
  );
}

function latestRecordingFile(recordingName: string): string | null {
  const dir = recordingsDir();
  if (!existsSync(dir)) {
    return null;
  }

  const candidates = readdirSync(dir)
    .filter((entry) => entry.startsWith(`${recordingName}_`))
    .map((entry) => join(dir, entry, "recording.har"))
    .filter((entry) => existsSync(entry))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  return candidates[0] ?? null;
}

export function hasProcareRecording(recordingName: string): boolean {
  return latestRecordingFile(recordingName) !== null;
}

export function getRecordedDailyActivitiesKidId(recordingName: string): string | null {
  const fixturePath = latestRecordingFile(recordingName);
  if (!fixturePath) {
    return null;
  }

  try {
    const raw = readFileSync(fixturePath, "utf8");
    const parsed = JSON.parse(raw) as {
      log?: { entries?: Array<Record<string, any>> };
    };

    for (const entry of parsed.log?.entries ?? []) {
      const request = entry.request as Record<string, any> | undefined;
      if (!request || typeof request.url !== "string") {
        continue;
      }
      if (!request.url.includes("/parent/daily_activities/")) {
        continue;
      }

      const url = new URL(request.url);
      const kidId = url.searchParams.get("kid_id");
      if (kidId) {
        return kidId;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function createProcareFixtureHarness(
  recordingName: string,
): Promise<ProcareFixtureHarness> {
  registerPolly();

  const mode: FixtureMode = process.env.PROCARE_FIXTURE_MODE === "record" ? "record" : "replay";
  const hasRecordings = hasProcareRecording(recordingName);
  const requests: RecordedRequest[] = [];

  let polly: Polly | undefined;
  if (mode === "record" || hasRecordings) {
    polly = new Polly(recordingName, {
      adapters: ["fetch"],
      persister: "fs",
      mode,
      logLevel: 0,
      recordIfMissing: mode === "record",
      matchRequestsBy: {
        method: true,
        headers: false,
        body: false,
        order: false,
        url: {
          hash: false,
          protocol: true,
          username: false,
          password: false,
          hostname: true,
          port: true,
          pathname: true,
          query: true,
        },
      },
      persisterOptions: {
        fs: {
          recordingsDir: recordingsDir(),
        },
      },
    } as any);
  }

  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    requests.push({
      method: init?.method ?? "GET",
      url,
      headers: normalizeHeaders(init?.headers),
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    return fetch(url, init);
  }) as typeof fetch;

  return {
    mode,
    hasRecordings,
    requests,
    fetchImpl,
    stop: async () => {
      if (polly) {
        await polly.stop();
      }
    },
  };
}
