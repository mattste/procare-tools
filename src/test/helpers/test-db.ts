import { openDatabase } from "../../db/connection.js";
import { SqliteDataProvider } from "../../provider/sqlite.js";
import type { Activity, Child } from "../../types.js";

/**
 * Creates an in-memory SqliteDataProvider pre-loaded with test data.
 * Caller is responsible for calling .close() when done.
 */
export function createTestProvider(
  children: Child[] = [],
  activities: Activity[] = [],
): SqliteDataProvider {
  const db = openDatabase({ path: ":memory:" });
  const provider = new SqliteDataProvider(db);

  // Seed synchronously — the async methods are thin wrappers
  for (const child of children) {
    provider.upsertChild(child);
  }
  if (activities.length > 0) {
    provider.addActivities(activities);
  }

  return provider;
}
