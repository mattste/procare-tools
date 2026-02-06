# Procare Tools

A Claude Code plugin for querying childcare activity data from Procare.

## Project structure

```
procare-tools/
├── .claude-plugin/
│   └── plugin.json                          # Plugin manifest
├── src/
│   ├── index.ts                             # Public API re-exports
│   ├── types.ts                             # TypeScript types (Child, Activity, etc.)
│   ├── db/
│   │   ├── connection.ts                    # SQLite connection factory
│   │   └── schema.ts                        # Schema migrations
│   ├── provider/
│   │   ├── interface.ts                     # Abstract DataProvider interface
│   │   ├── sqlite.ts                        # SQLite-backed implementation
│   │   ├── index.ts                         # Re-exports
│   │   └── sqlite.unit.test.ts              # Unit tests
│   └── test/
│       ├── fixtures/
│       │   └── sample-data.ts               # Realistic test data (Emma, Liam)
│       ├── helpers/
│       │   └── test-db.ts                   # In-memory test DB factory
│       └── daily-reports.integration.test.ts # Integration tests
├── skills/
│   ├── procare-query/
│   │   └── SKILL.md                         # Main query skill
│   └── procare-data-provider/
│       └── SKILL.md                         # Data access layer skill
├── agents/
│   └── procare-assistant.md                 # Subagent for childcare queries
├── docs/
│   └── data-model.md                        # Data model reference
└── CLAUDE.md                                # This file
```

## Development

```bash
bun install          # Install dependencies
bun test             # Run all tests
bun test --filter unit         # Unit tests only
bun test --filter integration  # Integration tests only
bun run typecheck    # TypeScript type checking
```

## Architecture

- **`DataProvider` interface** (`src/provider/interface.ts`): Abstract contract for data access. Any backing store (SQLite, API, email parser) implements this.
- **`SqliteDataProvider`** (`src/provider/sqlite.ts`): SQLite-backed implementation using `bun:sqlite`. Stores children and activities with JSON-serialized details.
- **Schema management** (`src/db/schema.ts`): Versioned migrations applied automatically on connection open.
- **Test harness** (`src/test/`): In-memory SQLite via `createTestProvider()`, realistic fixtures for two children with full-day activity data.

## Key design decisions

- **Bun runtime**: Uses `bun:sqlite` (built-in) and `bun:test` — no external dependencies for SQLite or testing
- **Plugin, not standalone**: Built as a plugin so it can be shared and installed across projects
- **Skill-based architecture**: `procare-query` handles user questions, `procare-data-provider` abstracts the data source
- **Agent delegation**: The `procare-assistant` agent is a lightweight haiku-powered agent that handles the full query flow
- **Data source agnostic**: The `DataProvider` interface is independent of the backing store — swap SQLite for an API client without changing query logic

## Current status

**SQLite data layer implemented with full test coverage. Not yet connected to live Procare data.**

## Next steps

1. Investigate Procare API availability (parent-facing endpoints, auth)
2. Get a sample Procare daily report email and analyze the format
3. Implement an ingestion pipeline (API poller or email parser) that writes to SQLite via the DataProvider
4. Wire the procare-query skill to call the DataProvider at query time
5. Test end-to-end with real data
