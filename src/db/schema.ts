import { Database } from "bun:sqlite";

const SCHEMA_VERSION = 1;

const MIGRATIONS: string[] = [
  // v1: initial schema
  `
  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    classroom TEXT NOT NULL,
    date_of_birth TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    end_time TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    reported_by TEXT,
    FOREIGN KEY (child_id) REFERENCES children(id)
  );

  CREATE INDEX IF NOT EXISTS idx_activities_child_id ON activities(child_id);
  CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
  CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
  CREATE INDEX IF NOT EXISTS idx_activities_child_type_ts ON activities(child_id, type, timestamp);

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );
  `,
];

export function initializeSchema(db: Database): void {
  const currentVersion = getSchemaVersion(db);
  if (currentVersion >= SCHEMA_VERSION) return;

  db.exec("BEGIN");
  try {
    for (let i = currentVersion; i < SCHEMA_VERSION; i++) {
      db.exec(MIGRATIONS[i]);
    }
    db.exec(`DELETE FROM schema_version`);
    db.exec(`INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})`);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function getSchemaVersion(db: Database): number {
  try {
    const row = db
      .query("SELECT version FROM schema_version LIMIT 1")
      .get() as { version: number } | null;
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}
