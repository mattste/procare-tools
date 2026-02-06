import { Database } from "bun:sqlite";
import { initializeSchema } from "./schema.js";

export interface ConnectionOptions {
  /** Path to SQLite file, or ":memory:" for in-memory DB. */
  path: string;
  /** Enable WAL mode for better concurrent read performance. Default: true. */
  wal?: boolean;
}

/**
 * Open a SQLite database connection and initialize the schema.
 * For tests, use ":memory:" as the path.
 */
export function openDatabase(options: ConnectionOptions): Database {
  const db = new Database(options.path);
  if (options.wal !== false) {
    db.exec("PRAGMA journal_mode=WAL");
  }
  db.exec("PRAGMA foreign_keys=ON");
  initializeSchema(db);
  return db;
}
