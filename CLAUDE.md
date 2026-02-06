# Procare Tools

A Claude Code plugin for querying childcare activity data from Procare.

## Project structure

```
procare-tools/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── skills/
│   ├── procare-query/
│   │   └── SKILL.md          # Main query skill — handles parent questions
│   └── procare-data-provider/
│       └── SKILL.md          # Data access layer (stub — not yet implemented)
├── agents/
│   └── procare-assistant.md  # Subagent for childcare queries
├── docs/
│   └── data-model.md         # Data model interfaces and type definitions
└── CLAUDE.md                 # This file
```

## Current status

**Scaffolded, not yet connected to live data.**

The data model, skills, and agent are defined. The next step is to figure out how to get data from Procare (API, email parsing, or web scraping) and implement the data provider.

## Key design decisions

- **Plugin, not standalone**: Built as a plugin so it can be shared and installed across projects
- **Skill-based architecture**: `procare-query` handles user questions, `procare-data-provider` abstracts the data source
- **Agent delegation**: The `procare-assistant` agent is a lightweight haiku-powered agent that handles the full query flow
- **Data source agnostic**: The interfaces are defined independent of the data source, so swapping between API/email/scraping only requires changing the provider implementation

## Next steps

1. Investigate Procare API availability (parent-facing endpoints, auth)
2. Get a sample Procare daily report email and analyze the format
3. Implement the data provider for whichever source is viable
4. Add caching for parsed activity data
5. Test with real queries
