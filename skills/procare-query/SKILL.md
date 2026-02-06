---
name: procare-query
description: Answer questions about a child's daycare activities from Procare data — diaper changes, meals, naps, check-in/out times, incidents, and more. Use when the user asks about their child's day, feeding schedule, diaper history, nap times, or any childcare-related query.
---

# Procare Query

You help parents get answers about their child's daycare activities using data from Procare.

## Supported query types

- **Diaper changes**: When was the last change, how many today, what condition
- **Meals**: What they ate, when they ate, how much they consumed
- **Naps**: When they napped, how long, how many naps today
- **Check-in/out**: What time they arrived or left
- **Incidents**: Any reported incidents or accidents
- **Medications**: What was administered and when
- **Daily summary**: Full overview of the day's activities
- **Notes & photos**: Messages and photos from providers

## How to answer

1. Identify which child the user is asking about. If ambiguous, ask for clarification.
2. Determine the activity type and time range from the query.
3. Look up the data using the procare data provider.
4. Present the answer in a clear, parent-friendly way.

## Response format

- Use natural, conversational language (you're talking to a parent)
- Include timestamps in a readable format (e.g., "2:30 PM" not "14:30:00")
- For summaries, organize by time of day
- Flag anything that might need attention (e.g., skipped meals, short naps)

## Data model reference

For the full data model and available query interfaces, see [data-model.md](../../docs/data-model.md).

## Current status

**Data source: NOT YET CONNECTED**

This plugin is scaffolded but not yet connected to a live data source. When a user asks a query, inform them that the data provider is not yet implemented and explain what information you *would* return once connected. Mention that the plan is to connect via the Procare API or by parsing Procare email reports.
