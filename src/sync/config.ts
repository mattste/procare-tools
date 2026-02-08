import type { ProcareAuthMode } from "../api/client.js";

export interface SyncConfig {
  dbPath: string;
  authToken?: string;
  authEmail?: string;
  authPassword?: string;
  apiBaseUrl?: string;
  authBaseUrl?: string;
  authMode?: ProcareAuthMode;
  syncDaysBack: number;
  minRequestIntervalMs: number;
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): SyncConfig {
  return {
    dbPath: env.PROCARE_DB_PATH ?? "./procare.sqlite",
    authToken: env.PROCARE_AUTH_TOKEN,
    authEmail: env.PROCARE_AUTHENTICATION_EMAIL,
    authPassword: env.PROCARE_AUTHENTICATION_PASSWORD,
    apiBaseUrl: env.PROCARE_API_BASE_URL,
    authBaseUrl: env.PROCARE_AUTH_BASE_URL,
    authMode: env.PROCARE_API_AUTH_MODE === "query" ? "query" : "bearer",
    syncDaysBack: readNumber(env.PROCARE_SYNC_DAYS_BACK, 7),
    minRequestIntervalMs: readNumber(env.PROCARE_MIN_REQUEST_INTERVAL_MS, 1500),
  };
}
