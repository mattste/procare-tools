# Procare Data Collection Strategy

## Overview

Implement **Option 2: API Client + SQLite Cache** — a TypeScript API client that wraps Procare's REST endpoints, a mapper layer that converts API responses to our internal types, and a sync engine that pulls data into the existing SQLite store.

**Source of truth for API shape:** HAR recording from `schools.procareconnect.com` / `api-school.procareconnect.com` captured 2026-02-07.

---

## Procare API Reference (Reverse-Engineered)

**Base URL:** `https://api-school.procareconnect.com/api/web`

### Authentication

Login returns an `auth_token` (e.g., `online_auth_4JyQc34SKA72kFWemAJM628u`) in the user response. This token is sent on subsequent requests (likely via cookie or `Authorization` header — the exact mechanism needs to be confirmed by testing a raw `fetch` call with the token as a Bearer header or query param).

### Endpoints

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET | `/user/` | User profile, auth token, school info, carer details | Yes |
| GET | `/list_options/` | Activity types, meal types, diaper details, config enums | Yes |
| GET | `/parent/kids/` | Children for the authenticated parent | Yes |
| GET | `/parent/daily_activities/?kid_id={id}&filters[daily_activity][date_to]={YYYY-MM-DD}&page={n}` | Paginated daily activities | Yes |
| GET | `/parent/billing/payment_methods/` | Payment methods (not needed for activities) | Yes |
| GET | `/parent/billing/billing_transactions/info/?family_id={id}` | Billing summary (not needed for activities) | Yes |

### Key response shapes

**`/parent/kids/`** returns:
```json
{
  "kids": [{
    "id": "uuid",
    "first_name": "Orla",
    "last_name": "Stewart-Ronnisch",
    "dob": "2025-05-21",
    "current_section_id": "uuid",
    "registration_status": "active",
    "time_schedule": { "M": ["am","pm"], "T": ["am","pm"], ... }
  }]
}
```

**`/parent/daily_activities/`** returns (paginated, 30/page):
```json
{
  "page": 1,
  "per_page": 30,
  "daily_activities": [{
    "id": "uuid",
    "activity_time": "2026-02-06T14:20:26.000-08:00",
    "activity_date": "2026-02-06",
    "activity_type": "bathroom_activity",
    "data": { "type": "Diaper", "sub_type": "Wet", ... },
    "comment": "",
    "staff_present_name": "Ericka Stokes they/them",
    "kid_ids": ["uuid"],
    "photo_url": null
  }]
}
```

### Activity type mapping (Procare → our types)

| Procare `activity_type` | Our `ActivityType` | Data fields |
|---|---|---|
| `bathroom_activity` | `DIAPER` | `data.sub_type`: "Wet", "BM", "BM & Wet", "Dry" |
| `meal_activity` | `MEAL` | `data.type`: "Lunch" etc, `data.quantity`: "All"/"Most"/"Some"/"None", `data.desc` |
| `nap_activity` | `NAP` | `data.start_time`, `data.end_time` (separate records for start/end) |
| `bottle_activity` | `BOTTLE` (new) | `data.amount`: "2.5" (oz), `data.bottle_consumed` |
| `sign_in_activity` | `CHECK_IN` | `activiable.sign_in_time`, `activiable.signed_in_by`, `activiable.section.name` |
| `sign_out_activity` | `CHECK_OUT` | `activiable.sign_out_time`, `activiable.signed_out_by` |
| `note_activity` | `NOTE` | `data.desc` |
| `learning_activity` | `LEARNING` | `comment`, `activiable.learning_activity_name.value`, `activiable.learning_activity_categories`, `photo_url` |
| `incident_activity` | `INCIDENT` | (not yet observed in HAR, shape TBD) |
| `photo_activity` | `PHOTO` | (not yet observed in HAR, shape TBD) |
| `mood_activity` | `MOOD` (new) | (not yet observed, listed in `list_options`) |

---

## Implementation Plan

### Phase 1: Type & Schema Updates

**Goal:** Extend the type system and database schema to support all Procare activity types observed in the HAR.

**Files to create/modify:**

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | Add `BOTTLE` and `MOOD` to `ActivityType` enum. Add `BottleDetails` interface (`amount: number`, `bottleConsumed?: number`). Add `LearningDetails` interface (`activityName: string`, `categories: string[]`, `photoUrl?: string`). |
| `src/db/schema.ts` | Modify | Add migration v2: `sync_metadata` table (`key TEXT PK, value TEXT`) for tracking sync state. Add `ON CONFLICT REPLACE` to activity inserts so re-syncing is idempotent. |
| `src/test/fixtures/sample-data.ts` | Modify | Add bottle and learning activity examples to test fixtures. |

**Suggested subagent:** Single agent, sequential. Small scope — just type additions and a migration.

---

### Phase 2: Procare API Client

**Goal:** A typed HTTP client that wraps the Procare REST endpoints. Returns raw Procare response shapes (not yet mapped to our types).

**Files to create:**

| File | Description |
|------|-------------|
| `src/api/types.ts` | Raw Procare API response interfaces: `ProcareUser`, `ProcareKid`, `ProcareDailyActivity`, `ProcareListOptions`. Typed exactly as the API returns them. |
| `src/api/client.ts` | `ProcareApiClient` class. Constructor takes `{ authToken, baseUrl? }`. Methods: `getUser()`, `getKids()`, `getDailyActivities(kidId, dateTo, page)`, `getListOptions()`. Uses Bun's native `fetch`. Handles pagination internally for `getDailyActivities`. |
| `src/api/client.unit.test.ts` | Tests using mocked `fetch` (Bun supports `mock.module` or we can inject fetch). Verifies correct URL construction, header handling, pagination, error handling (401/403/network). |
| `src/api/index.ts` | Re-exports. |

**Key design decisions:**
- The client does NOT map to our internal types — it returns raw Procare shapes. This keeps the client honest to the API and makes it easy to test independently.
- Auth token is passed in constructor. The client doesn't handle login — that's a separate concern.
- Pagination: `getAllDailyActivities(kidId, dateTo)` loops through pages until the response has fewer than `per_page` items.

**Auth header investigation:** Before writing the client, we need to confirm how the auth token is sent. The HAR stripped auth headers/cookies, but we can test with a simple `curl` using `Authorization: Bearer online_auth_...` or by setting a cookie. This should be a quick manual test or a small exploratory script.

**Suggested subagent:** One agent to create the API types + client. Can run in parallel with Phase 1 since they're independent.

---

### Phase 3: Activity Mapper

**Goal:** Pure functions that convert Procare API response shapes → our `Activity` / `Child` types. This is the most nuanced part because Procare's data shapes differ from ours.

**Files to create:**

| File | Description |
|------|-------------|
| `src/api/mapper.ts` | `mapProcareKid(raw: ProcareKid): Child` — maps kid response to our Child. `mapProcareActivity(raw: ProcareDailyActivity): Activity` — maps each activity type. |
| `src/api/mapper.unit.test.ts` | One test per activity type using real response snippets from the HAR as fixtures. Tests edge cases: nap with only start_time, nap with only end_time, "BM & Wet" diaper mapping, meal with description, bottle amount parsing. |

**Mapping details:**

```
Procare bathroom_activity → Activity(DIAPER)
  data.sub_type "Wet"      → condition: "wet"
  data.sub_type "BM"       → condition: "bm"
  data.sub_type "BM & Wet" → condition: "wet+bm"
  data.sub_type "Dry"      → condition: "dry"

Procare meal_activity → Activity(MEAL)
  data.type "Lunch"/"Breakfast"/"PM Snack"/etc → mealType mapping
  data.quantity "All"/"Most"/"Some"/"None"     → amount
  data.desc                                    → notes

Procare nap_activity → Activity(NAP)
  Tricky: Procare sends SEPARATE records for start and end
  data.start_time (non-empty) + data.end_time (empty) = nap start
  data.start_time (empty) + data.end_time (non-empty) = nap end
  Strategy: The mapper emits one Activity per record. The sync engine
  can optionally merge start/end pairs into a single Activity with
  timestamp + endTime + computed duration.

Procare bottle_activity → Activity(BOTTLE)
  data.amount → amount (parse to number)
  data.bottle_consumed → bottleConsumed (parse to number)

Procare sign_in/out → Activity(CHECK_IN/CHECK_OUT)
  activiable.sign_in_time / sign_out_time → timestamp
  activiable.signed_in_by / signed_out_by → reportedBy
  activiable.section.name → (store in details)

Procare learning_activity → Activity(LEARNING)
  activiable.learning_activity_name.value → activityName
  activiable.learning_activity_categories[].value → categories
  comment → notes
  photo_url → photoUrl in details

Procare note_activity → Activity(NOTE)
  data.desc → notes
```

**Nap merging strategy:** Procare sends nap start and nap end as separate activity records. We have two options:
1. **Store both as separate records** (simpler, preserves raw data)
2. **Merge pairs during sync** (match by proximity in time, combine into one Activity with `timestamp`=start, `endTime`=end, compute `duration`)

Recommendation: Start with option 1 (store both), add a post-processing step that can merge them. The `getDailySummary` method can handle pairing at query time.

**Suggested subagent:** One agent for mapper + tests. Depends on Phase 2 types being defined, so run after Phase 2's `src/api/types.ts` is written (but the client tests can run in parallel).

---

### Phase 4: Sync Engine

**Goal:** Orchestrates pulling data from the API client and writing to SQLite via the DataProvider. Handles incremental sync, deduplication, and state tracking.

**Files to create:**

| File | Description |
|------|-------------|
| `src/sync/engine.ts` | `SyncEngine` class. Constructor takes `{ apiClient: ProcareApiClient, provider: DataProvider }`. Methods: `syncAll()` — full sync of all kids and recent activities. `syncKid(kidId, since?)` — sync activities for one kid since a date. `syncChildren()` — pull and upsert all children. |
| `src/sync/engine.unit.test.ts` | Tests with mocked API client and in-memory SQLite. Verify: children get upserted, activities get written, pagination is handled, duplicate activities aren't duplicated (idempotent), sync metadata is updated. |
| `src/sync/config.ts` | `SyncConfig` interface: `authToken`, `dbPath`, `baseUrl?`, `syncDaysBack?` (default 7). `loadConfig()` reads from env vars or a `.procare.json` config file. |
| `src/sync/index.ts` | Re-exports. |

**Sync algorithm:**

```
syncAll():
  1. Call apiClient.getKids()
  2. For each kid, map and upsert via provider.upsertChild()
  3. For each kid, call syncKid(kid.id)
  4. Update sync_metadata with last_sync_time

syncKid(kidId, since?):
  1. Determine dateTo = today, dateFrom = since ?? last_sync_date ?? 7 days ago
  2. Call apiClient.getAllDailyActivities(kidId, dateTo)
  3. Filter to activities with activity_date >= dateFrom
  4. Map each via mapper.mapProcareActivity()
  5. Write via provider.addActivities() (with ON CONFLICT REPLACE for idempotency)
  6. Update sync_metadata[`last_sync_${kidId}`] = today
```

**Idempotency:** The key insight is that Procare assigns UUIDs to each activity. We use these as our `Activity.id`. With `ON CONFLICT REPLACE` in SQLite, re-syncing the same data is a no-op. This means we don't need complex "last synced" tracking — we can always re-fetch the last N days and let SQLite deduplicate.

**Suggested subagent:** One agent. Depends on Phase 2 (client) and Phase 3 (mapper). This is the integration layer.

---

### Phase 5: CLI Entry Point

**Goal:** A runnable script that performs a sync, so you can run it manually or via cron.

**Files to create:**

| File | Description |
|------|-------------|
| `src/sync/cli.ts` | Entry point: reads config, creates API client, opens DB, runs `syncEngine.syncAll()`, logs results, closes DB. Runnable via `bun run src/sync/cli.ts`. |
| `package.json` | Add `"sync": "bun run src/sync/cli.ts"` script. |

**Suggested subagent:** Trivial — can be done inline after Phase 4.

---

### Phase 6: Skill & Agent Wiring

**Goal:** Connect the existing skill definitions to the live data pipeline.

**Files to modify:**

| File | Action |
|------|--------|
| `skills/procare-data-provider/SKILL.md` | Update to document that it uses SQLite-backed provider populated by sync. Remove "not yet connected" caveats. |
| `skills/procare-query/SKILL.md` | Update to note that data comes from synced SQLite DB. |
| `agents/procare-assistant.md` | Update tools list to include sync capability. |
| `src/index.ts` | Export sync engine and API client. |

**Suggested subagent:** One agent for skill/doc updates after everything else works.

---

## Execution Plan (Parallelism & Subagents)

```
Phase 1 ─────────────┐
(types & schema)      │
                      ├──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
Phase 2 ─────────────┘    (mapper)     (sync)      (CLI)       (wiring)
(API client + types)
```

**Phases 1 and 2 can run in parallel** — they have no dependencies on each other.

### Suggested task execution

| Step | Task | Subagent | Parallel? |
|------|------|----------|-----------|
| 1a | Phase 1: Add BOTTLE/MOOD types, BottleDetails, LearningDetails, schema v2 | Agent A | Yes, with 1b |
| 1b | Phase 2: Create `src/api/types.ts` with raw Procare response interfaces | Agent B | Yes, with 1a |
| 2 | Phase 2 (cont): Create `src/api/client.ts` + tests | Agent B (continue) | After 1b |
| 3 | Phase 3: Create `src/api/mapper.ts` + tests | Agent C | After 1a + 1b |
| 4 | Phase 4: Create `src/sync/engine.ts` + tests | Agent D | After 2 + 3 |
| 5 | Phase 5: CLI entry point + package.json script | Inline | After 4 |
| 6 | Phase 6: Update skills, agent, exports | Inline | After 5 |
| 7 | Run full test suite, typecheck, fix issues | Agent E | After 6 |

### Before starting implementation

One manual investigation step is needed: **confirm how the auth token is sent.** Options to test:
1. `Authorization: Bearer online_auth_...` header
2. Custom header (e.g., `X-Auth-Token`)
3. Cookie-based session
4. Query parameter

This can be tested with a single `curl` command against `/api/web/parent/kids/` using the token from your HAR. If the token has expired, you'd need to log in again and capture a fresh one.

---

## Files Summary (New)

```
src/
  api/
    types.ts              # Raw Procare API response interfaces
    client.ts             # ProcareApiClient (HTTP wrapper)
    client.unit.test.ts   # Client tests with mocked fetch
    mapper.ts             # Procare → internal type mapping
    mapper.unit.test.ts   # Mapper tests with HAR fixtures
    index.ts              # Re-exports
  sync/
    engine.ts             # SyncEngine orchestration
    engine.unit.test.ts   # Sync tests with mocked client + in-memory DB
    config.ts             # Config loading (env vars / .procare.json)
    cli.ts                # CLI entry point for manual/cron sync
    index.ts              # Re-exports
```

## Files Summary (Modified)

```
src/types.ts                    # Add BOTTLE, MOOD, BottleDetails, LearningDetails
src/db/schema.ts                # Migration v2: sync_metadata table, upsert support
src/test/fixtures/sample-data.ts # Add bottle/learning fixtures
src/index.ts                    # Export new modules
package.json                    # Add sync script
skills/procare-data-provider/   # Update with live data instructions
skills/procare-query/           # Update status
agents/procare-assistant.md     # Update tools
```

## Open Questions

1. **Auth mechanism**: How exactly is the auth token sent? Need to verify with a test request.
2. **Token expiry**: How long does `online_auth_*` last? Days? Weeks? Do we need auto-refresh?
3. **Rate limiting**: Does Procare rate-limit API calls? The HAR shows fast responses (~200ms) but we should be respectful.
4. **Nap merging**: Store raw start/end pairs, or merge during sync? (Plan recommends: store raw, merge at query time.)
5. **Historical backfill**: How far back can we paginate? Is there a limit on `daily_activities` pages?
6. **`Requested-From` header**: The HAR shows varying IP addresses in this header. Is it required? Is it validated? Need to test if requests work without it.
