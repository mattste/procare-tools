# Typecheck

Run TypeScript type checking and fix type errors for this project.

## Running the type checker

```bash
bun run typecheck    # Runs: tsc --noEmit
```

## Configuration

The project uses TypeScript strict mode (`tsconfig.json`):

- **target**: ES2022
- **module**: Node16 (with Node16 module resolution)
- **strict**: true (enables all strict checks)
- **Source**: `src/**/*` (excluding `*.test.ts` files)
- **Output**: `dist/` (declarations + source maps)

## Common type patterns in this project

### Activity details discriminated union

`ActivityDetails` is a union type — use type narrowing when accessing type-specific fields:

```typescript
import type { Activity, MealDetails, DiaperDetails } from "../types.js";

// Correct: narrow first
if (activity.type === ActivityType.MEAL) {
  const details = activity.details as MealDetails;
  console.log(details.mealType, details.items);
}

// Incorrect: accessing union fields directly
// activity.details.mealType  // Error: Property 'mealType' does not exist on type 'ActivityDetails'
```

### ISO date strings, not Date objects

All dates and timestamps in this project are `string` (ISO 8601 format), not `Date` objects:

```typescript
// Correct
const date: string = "2025-01-15";
const timestamp: string = "2025-01-15T09:00:00";

// Incorrect — this project does not use Date objects in its interfaces
const date: Date = new Date();
```

### Import patterns

Use `.js` extensions in imports (required by Node16 module resolution):

```typescript
// Correct
import { SqliteDataProvider } from "./sqlite.js";
import type { Activity } from "../types.js";

// Incorrect — missing .js extension
import { SqliteDataProvider } from "./sqlite";
```

Use `import type` for type-only imports to avoid runtime overhead and circular dependency issues.

### JSON serialization in SQLite

Activity `details` are stored as JSON strings in SQLite. The provider handles serialization/deserialization, but be aware of this when writing raw queries:

```typescript
// The provider does this internally:
JSON.stringify(activity.details)  // write
JSON.parse(row.details)           // read
```

## Fixing common type errors

| Error | Fix |
|-------|-----|
| `Cannot find module './foo'` | Add `.js` extension: `'./foo.js'` |
| `Property does not exist on type 'ActivityDetails'` | Narrow the type with `as MealDetails` (etc.) after checking `activity.type` |
| `Type 'Date' is not assignable to type 'string'` | Use ISO string: `date.toISOString()` or a literal string |
| `Parameter implicitly has an 'any' type` | Add explicit type annotation |
| `Object is possibly 'null'` | Add null check or use `!` (non-null assertion) when safe |
