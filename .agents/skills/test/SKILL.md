# Test

Run and write tests for this project using `bun:test`.

## Running tests

```bash
bun test                       # All tests
bun test --filter unit         # Unit tests only
bun test --filter integration  # Integration tests only
```

## Test organization

- **Unit tests**: Co-located with source files, suffixed `.unit.test.ts`
  - Example: `src/provider/sqlite.unit.test.ts` tests `src/provider/sqlite.ts`
- **Integration tests**: Live in `src/test/`, suffixed `.integration.test.ts`
  - Example: `src/test/daily-reports.integration.test.ts`
- **Fixtures**: `src/test/fixtures/sample-data.ts` — realistic test data for two children (Emma and Liam)
- **Helpers**: `src/test/helpers/test-db.ts` — in-memory test database factory

## Writing tests

### Setup pattern

Use `createTestProvider()` from `src/test/helpers/test-db.ts` to get an in-memory SQLite-backed provider pre-loaded with data:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createTestProvider } from "../test/helpers/test-db.js";
import { CHILD_EMMA, emmaFullDay } from "../test/fixtures/sample-data.js";
import { SqliteDataProvider } from "./sqlite.js";

describe("MyFeature", () => {
  let provider: SqliteDataProvider;

  beforeEach(() => {
    provider = createTestProvider([CHILD_EMMA], emmaFullDay());
  });

  afterEach(() => {
    provider?.close();
  });

  test("does something", async () => {
    const result = await provider.getActivities(CHILD_EMMA.id);
    expect(result).toHaveLength(10);
  });
});
```

### Conventions

- Always call `provider.close()` in `afterEach` to clean up the in-memory database
- Use `CHILD_EMMA` and `CHILD_LIAM` constants from fixtures for child references
- Use `emmaFullDay(date?)` and `liamPartialDay(date?)` to generate activity data for a given date
- Test both happy paths and edge cases (empty results, unknown IDs, boundary dates)
- Prefer specific assertions (`toEqual`, `toHaveLength`) over loose checks (`toBeTruthy`)

### Available fixture data

- `CHILD_EMMA`: A child with full-day activity data (10 activities: check-in, check-out, 3 diapers, 3 meals, 2 naps)
- `CHILD_LIAM`: A child with partial-day data (3 activities)
- `emmaFullDay(date?)`: Generates 10 activities for Emma on a given date (default: "2025-01-15")
- `liamPartialDay(date?)`: Generates 3 activities for Liam on a given date

### Adding a new DataProvider implementation

When implementing a new `DataProvider`, copy the test structure from `sqlite.unit.test.ts`. The `DataProvider` interface guarantees the same behavior regardless of backing store, so the same test cases should pass for any implementation.
