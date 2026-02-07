# Implement Provider

Guide for implementing a new `DataProvider` to add a new data source (API, email parser, etc.) to procare-tools.

## The DataProvider interface

All data providers implement `DataProvider` from `src/provider/interface.ts`:

```typescript
interface DataProvider {
  // Read operations
  getChildren(): Promise<Child[]>;
  getChild(childId: string): Promise<Child | null>;
  getActivities(childId: string, date?: string, type?: ActivityType): Promise<Activity[]>;
  getLatestActivity(childId: string, type: ActivityType): Promise<Activity | null>;
  getDailySummary(childId: string, date: string): Promise<DailySummary>;
  getActivitiesInRange(childId: string, startDate: string, endDate: string, type?: ActivityType): Promise<Activity[]>;

  // Write operations
  upsertChild(child: Child): Promise<void>;
  addActivity(activity: Activity): Promise<void>;
  addActivities(activities: Activity[]): Promise<void>;

  close(): void;
}
```

## Step-by-step implementation

### 1. Create the provider file

Add a new file at `src/provider/<name>.ts`:

```typescript
import type { DataProvider } from "./interface.js";
import type { Activity, ActivityType, Child, DailySummary } from "../types.js";

export class MyDataProvider implements DataProvider {
  // Implement all methods from the interface
}
```

### 2. Re-export from the index

Add to `src/provider/index.ts`:

```typescript
export { MyDataProvider } from "./<name>.js";
```

And to `src/index.ts` if it should be part of the public API.

### 3. Write unit tests

Create `src/provider/<name>.unit.test.ts`. Use the same test structure as `sqlite.unit.test.ts`:

- Test all read operations (getChildren, getActivities, getLatestActivity, etc.)
- Test all write operations (upsertChild, addActivity, addActivities)
- Test filtering (by date, by type, by date+type)
- Test ordering (results should be timestamp descending)
- Test edge cases (empty results, unknown IDs)
- Test data isolation between children

### 4. Implement DailySummary aggregation

`getDailySummary` must aggregate activities into a `DailySummary`. Reference the existing implementation in `sqlite.ts` for the logic:

- Find CHECK_IN and CHECK_OUT activities for the date
- Count diapers
- Collect naps (with durations from endTime)
- Collect meals
- Gather all notes
- Return the full `DailySummary` object

### 5. Handle JSON details

Activity `details` is a union type (`ActivityDetails`). When reading from external sources:

- Map the external format to the correct detail type (`DiaperDetails`, `MealDetails`, etc.)
- Validate required fields exist before constructing the object
- Use `Record<string, unknown>` as a fallback for unrecognized detail types

## Key contracts to maintain

- **Ordering**: `getActivities` and `getActivitiesInRange` return results ordered by timestamp **descending** (most recent first)
- **Date filtering**: When a `date` parameter is provided, only return activities whose timestamp falls on that calendar date
- **Null returns**: `getChild` and `getLatestActivity` return `null` when no match is found (not undefined, not an error)
- **ISO strings**: All dates are `YYYY-MM-DD`, all timestamps are ISO 8601 datetime strings
- **Idempotent upsert**: `upsertChild` should insert or update based on the child's `id`

## Reference implementation

See `src/provider/sqlite.ts` (~400 lines) for a complete working implementation. Key patterns:

- Constructor accepts a database connection
- Prepared statements for performance
- JSON.stringify/parse for the `details` column
- Transaction wrapping for `addActivities` batch inserts
