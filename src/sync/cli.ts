import { authenticateProcare } from "../api/auth.js";
import { ProcareApiClient } from "../api/client.js";
import { openDatabase } from "../db/connection.js";
import { SqliteDataProvider } from "../provider/sqlite.js";
import { loadConfig } from "./config.js";
import { SyncEngine } from "./engine.js";

async function resolveAuthToken(config: ReturnType<typeof loadConfig>): Promise<string> {
  if (config.authToken) {
    return config.authToken;
  }

  if (!config.authEmail || !config.authPassword) {
    throw new Error(
      "Missing auth credentials. Set PROCARE_AUTH_TOKEN or PROCARE_AUTHENTICATION_EMAIL/PROCARE_AUTHENTICATION_PASSWORD.",
    );
  }

  const auth = await authenticateProcare({
    email: config.authEmail,
    password: config.authPassword,
    baseUrl: config.authBaseUrl,
  });

  return auth.authToken;
}

export async function runSyncCli(): Promise<void> {
  const config = loadConfig();
  const authToken = await resolveAuthToken(config);

  const db = openDatabase({ path: config.dbPath });
  const provider = new SqliteDataProvider(db);

  try {
    const apiClient = new ProcareApiClient({
      authToken,
      baseUrl: config.apiBaseUrl,
      authMode: config.authMode,
      minRequestIntervalMs: config.minRequestIntervalMs,
    });

    const engine = new SyncEngine({
      apiClient,
      provider,
      syncDaysBack: config.syncDaysBack,
    });

    const result = await engine.syncAll();

    console.log(
      `Synced ${result.syncedChildren} children and ${result.syncedActivities} activities at ${result.syncedAt}.`,
    );
  } finally {
    provider.close();
  }
}

if (import.meta.main) {
  runSyncCli().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
