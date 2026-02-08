---
name: procare-data-provider
description: Data access layer for Procare childcare records. Provides structured access to activity data from a SQLite cache synced from Procare's REST API.
user-invocable: false
---

# Procare Data Provider

This skill defines how to retrieve childcare activity data from Procare. It is a dependency of the `procare-query` skill and is not intended to be invoked directly by users.

## Data source (implemented)

This provider now uses a synced SQLite cache backed by Procare's parent-facing REST API:

1. `src/api/auth.ts` authenticates against `https://online-auth.procareconnect.com/sessions/`
2. `src/api/client.ts` fetches kids and daily activities from `https://api-school.procareconnect.com/api/web`
3. `src/api/mapper.ts` maps raw Procare payloads to internal `Child`/`Activity` types
4. `src/sync/engine.ts` upserts children and activities into SQLite
5. `SqliteDataProvider` serves query-time reads

## Interface contract

Regardless of the data source, the provider must support these queries:

```
getChildren() -> Child[]
getActivities(childId, date?, type?) -> Activity[]
getLatestActivity(childId, type) -> Activity?
getDailySummary(childId, date) -> DailySummary
getActivitiesInRange(childId, startDate, endDate, type?) -> Activity[]
```

See [data-model.md](../../docs/data-model.md) for full type definitions.

## Configuration

Configuration is loaded from environment variables:

| Setting       | Description                              |
|---------------|------------------------------------------|
| PROCARE_AUTH_TOKEN | Optional pre-fetched API token |
| PROCARE_AUTHENTICATION_EMAIL | Login email used to fetch token |
| PROCARE_AUTHENTICATION_PASSWORD | Login password used to fetch token |
| PROCARE_DB_PATH | SQLite path (default `./procare.sqlite`) |
| PROCARE_SYNC_DAYS_BACK | Incremental sync lookback window |
| PROCARE_MIN_REQUEST_INTERVAL_MS | Delay between API calls (default 1500ms) |
