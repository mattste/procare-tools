# Code Review

Checklist for reviewing code changes in procare-tools.

## Pre-review

1. Run `bun run typecheck` — all changes must pass strict TypeScript checking
2. Run `bun test` — all existing tests must pass
3. Check that new code has corresponding tests

## Checklist

### Types and interfaces

- [ ] Uses types from `src/types.ts` — never redefines `Child`, `Activity`, `ActivityType`, etc.
- [ ] Activity details use the correct detail type (`DiaperDetails`, `MealDetails`, etc.)
- [ ] Dates are ISO strings (`string`), not `Date` objects
- [ ] Uses `import type` for type-only imports
- [ ] Imports use `.js` extensions (Node16 module resolution)

### DataProvider implementations

- [ ] Implements the full `DataProvider` interface from `src/provider/interface.ts`
- [ ] `getActivities` and `getActivitiesInRange` return results ordered by timestamp descending
- [ ] `getChild` and `getLatestActivity` return `null` (not `undefined`) for missing data
- [ ] `upsertChild` is idempotent (insert or update by `id`)
- [ ] `addActivities` handles batch inserts (ideally in a transaction)
- [ ] `close()` releases all resources
- [ ] `getDailySummary` correctly aggregates: check-in/out times, diaper count, naps, meals, notes

### Tests

- [ ] Unit tests cover happy paths and edge cases
- [ ] Test file follows naming convention: `*.unit.test.ts` or `*.integration.test.ts`
- [ ] Uses `createTestProvider()` from `src/test/helpers/test-db.ts` for setup
- [ ] Calls `provider.close()` in `afterEach`
- [ ] Uses fixture data (`CHILD_EMMA`, `CHILD_LIAM`, `emmaFullDay`, `liamPartialDay`)

### Schema changes

- [ ] New migrations added to `src/db/schema.ts` with incremented version number
- [ ] Migrations are backwards-compatible (additive only, no column drops)
- [ ] New indexes justified by query patterns

### General

- [ ] No external runtime dependencies added (use Bun built-ins)
- [ ] No secrets or credentials committed (check `.env`, API keys, tokens)
- [ ] No `console.log` debugging left in production code
- [ ] Error handling is minimal and appropriate — no over-engineering
