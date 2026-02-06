---
name: procare-data-provider
description: Data access layer for Procare childcare records. Provides structured access to activity data. This skill defines the interface for fetching data — the concrete implementation will be added once the data source (API or email) is determined.
user-invocable: false
---

# Procare Data Provider

This skill defines how to retrieve childcare activity data from Procare. It is a dependency of the `procare-query` skill and is not intended to be invoked directly by users.

## Data source options (to be implemented)

### Option 1: Procare API

Procare may expose a parent-facing API. If available, this provider would authenticate and query the API directly.

**Needs investigation:**
- Does Procare have a public or undocumented API?
- What authentication method is used (OAuth, API key, session cookie)?
- What endpoints are available for activity data?
- Rate limits and data freshness

### Option 2: Email report parsing

Procare sends daily activity reports via email. This provider would:
1. Connect to the parent's email (via IMAP or Gmail API)
2. Find Procare report emails
3. Parse the HTML email body into structured Activity records
4. Cache parsed data locally

**Needs investigation:**
- What does the Procare email report format look like?
- How consistent is the format across providers?
- How frequently are reports sent?

### Option 3: Procare web scraping

As a fallback, the provider could authenticate to the Procare parent portal and scrape activity data.

**Needs investigation:**
- Portal URL and authentication flow
- Page structure for activity data
- Session management

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

The provider will need configuration stored securely (not in the repo):

| Setting       | Description                              |
|---------------|------------------------------------------|
| dataSource    | "api", "email", or "scrape"              |
| credentials   | Auth credentials for the chosen source   |
| childIds      | Mapping of child names to Procare IDs    |
| cacheDir      | Local directory for caching parsed data  |
| cacheTtl      | How long cached data remains valid       |
