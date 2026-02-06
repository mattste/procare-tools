import type { Activity, ActivityType, Child, DailySummary } from "../types.js";

/**
 * Abstract interface for accessing Procare childcare data.
 * Implementations may back this with SQLite, an API, email parsing, etc.
 */
export interface DataProvider {
  /** List all enrolled children. */
  getChildren(): Promise<Child[]>;

  /** Get a single child by ID. */
  getChild(childId: string): Promise<Child | null>;

  /**
   * Get activities for a child, optionally filtered by date and/or type.
   * Results are ordered by timestamp descending (most recent first).
   */
  getActivities(
    childId: string,
    date?: string,
    type?: ActivityType,
  ): Promise<Activity[]>;

  /** Get the most recent activity of a given type for a child. */
  getLatestActivity(
    childId: string,
    type: ActivityType,
  ): Promise<Activity | null>;

  /** Get a full daily summary for a child on a given date. */
  getDailySummary(childId: string, date: string): Promise<DailySummary>;

  /**
   * Get activities within a date range, optionally filtered by type.
   * Results are ordered by timestamp descending.
   */
  getActivitiesInRange(
    childId: string,
    startDate: string,
    endDate: string,
    type?: ActivityType,
  ): Promise<Activity[]>;

  // --- Write operations (for ingesting data) ---

  /** Add or update a child record. */
  upsertChild(child: Child): Promise<void>;

  /** Add a new activity record. */
  addActivity(activity: Activity): Promise<void>;

  /** Add multiple activity records in a batch. */
  addActivities(activities: Activity[]): Promise<void>;

  /** Close the provider and release resources. */
  close(): void;
}
