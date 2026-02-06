import { Database } from "bun:sqlite";
import type {
  Activity,
  ActivityDetails,
  ActivityType,
  Child,
  DailySummary,
} from "../types.js";
import type { DataProvider } from "./interface.js";

interface ActivityRow {
  id: string;
  child_id: string;
  type: string;
  timestamp: string;
  end_time: string | null;
  details: string;
  notes: string | null;
  reported_by: string | null;
}

interface ChildRow {
  id: string;
  first_name: string;
  last_name: string;
  classroom: string;
  date_of_birth: string;
}

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    childId: row.child_id,
    type: row.type as ActivityType,
    timestamp: row.timestamp,
    endTime: row.end_time ?? undefined,
    details: JSON.parse(row.details) as ActivityDetails,
    notes: row.notes ?? undefined,
    reportedBy: row.reported_by ?? undefined,
  };
}

function rowToChild(row: ChildRow): Child {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    classroom: row.classroom,
    dateOfBirth: row.date_of_birth,
  };
}

export class SqliteDataProvider implements DataProvider {
  constructor(private db: Database) {}

  async getChildren(): Promise<Child[]> {
    const rows = this.db.query("SELECT * FROM children").all() as ChildRow[];
    return rows.map(rowToChild);
  }

  async getChild(childId: string): Promise<Child | null> {
    const row = this.db
      .query("SELECT * FROM children WHERE id = ?")
      .get(childId) as ChildRow | null;
    return row ? rowToChild(row) : null;
  }

  async getActivities(
    childId: string,
    date?: string,
    type?: ActivityType,
  ): Promise<Activity[]> {
    const conditions = ["child_id = ?"];
    const params: string[] = [childId];

    if (date) {
      conditions.push("date(timestamp) = ?");
      params.push(date);
    }
    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    const sql = `SELECT * FROM activities WHERE ${conditions.join(" AND ")} ORDER BY timestamp DESC`;
    const rows = this.db.query(sql).all(...params) as ActivityRow[];
    return rows.map(rowToActivity);
  }

  async getLatestActivity(
    childId: string,
    type: ActivityType,
  ): Promise<Activity | null> {
    const row = this.db
      .query(
        "SELECT * FROM activities WHERE child_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1",
      )
      .get(childId, type) as ActivityRow | null;
    return row ? rowToActivity(row) : null;
  }

  async getDailySummary(
    childId: string,
    date: string,
  ): Promise<DailySummary> {
    const activities = await this.getActivities(childId, date);

    // Sort chronologically for the summary
    const sorted = [...activities].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const checkInActivity = sorted.find((a) => a.type === "CHECK_IN");
    const checkOutActivity = sorted.find((a) => a.type === "CHECK_OUT");
    const diapers = sorted.filter((a) => a.type === "DIAPER");
    const naps = sorted.filter((a) => a.type === "NAP");
    const meals = sorted.filter((a) => a.type === "MEAL");
    const notes = sorted
      .filter((a) => a.notes)
      .map((a) => a.notes as string);

    return {
      childId,
      date,
      checkIn: checkInActivity?.timestamp,
      checkOut: checkOutActivity?.timestamp,
      activities: sorted,
      diaperCount: diapers.length,
      naps,
      meals,
      notes,
    };
  }

  async getActivitiesInRange(
    childId: string,
    startDate: string,
    endDate: string,
    type?: ActivityType,
  ): Promise<Activity[]> {
    const conditions = [
      "child_id = ?",
      "date(timestamp) >= ?",
      "date(timestamp) <= ?",
    ];
    const params: string[] = [childId, startDate, endDate];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    const sql = `SELECT * FROM activities WHERE ${conditions.join(" AND ")} ORDER BY timestamp DESC`;
    const rows = this.db.query(sql).all(...params) as ActivityRow[];
    return rows.map(rowToActivity);
  }

  async upsertChild(child: Child): Promise<void> {
    this.db
      .query(
        `INSERT INTO children (id, first_name, last_name, classroom, date_of_birth)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           classroom = excluded.classroom,
           date_of_birth = excluded.date_of_birth`,
      )
      .run(
        child.id,
        child.firstName,
        child.lastName,
        child.classroom,
        child.dateOfBirth,
      );
  }

  async addActivity(activity: Activity): Promise<void> {
    this.db
      .query(
        `INSERT INTO activities (id, child_id, type, timestamp, end_time, details, notes, reported_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        activity.id,
        activity.childId,
        activity.type,
        activity.timestamp,
        activity.endTime ?? null,
        JSON.stringify(activity.details),
        activity.notes ?? null,
        activity.reportedBy ?? null,
      );
  }

  async addActivities(activities: Activity[]): Promise<void> {
    const insert = this.db.prepare(
      `INSERT INTO activities (id, child_id, type, timestamp, end_time, details, notes, reported_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertMany = this.db.transaction((items: Activity[]) => {
      for (const a of items) {
        insert.run(
          a.id,
          a.childId,
          a.type,
          a.timestamp,
          a.endTime ?? null,
          JSON.stringify(a.details),
          a.notes ?? null,
          a.reportedBy ?? null,
        );
      }
    });

    insertMany(activities);
  }

  close(): void {
    this.db.close();
  }
}
