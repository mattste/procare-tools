# Procare Data Model

This document defines the data interfaces for childcare activity records sourced from Procare. These interfaces are the contract between the data provider (API, email parser, etc.) and the query skill.

## Core Types

### Child

Represents a child enrolled in a Procare-connected daycare.

| Field       | Type     | Description                          |
|-------------|----------|--------------------------------------|
| id          | string   | Unique identifier for the child      |
| firstName   | string   | Child's first name                   |
| lastName    | string   | Child's last name                    |
| classroom   | string   | Current classroom assignment         |
| dateOfBirth | date     | Child's date of birth                |

### ActivityType

Enum of activity categories tracked by Procare.

| Value          | Description                              |
|----------------|------------------------------------------|
| DIAPER         | Diaper change event                      |
| MEAL           | Meal or snack                            |
| NAP            | Sleep / nap period                       |
| CHECK_IN       | Arrival at daycare                       |
| CHECK_OUT      | Departure from daycare                   |
| INCIDENT       | Incident or accident report              |
| MEDICATION     | Medication administered                  |
| PHOTO          | Photo shared by provider                 |
| NOTE           | General note from provider               |
| LEARNING       | Learning activity or milestone           |

### Activity

A single activity event recorded for a child.

| Field       | Type         | Description                                    |
|-------------|--------------|------------------------------------------------|
| id          | string       | Unique identifier for the activity             |
| childId     | string       | Reference to the child                         |
| type        | ActivityType | Category of activity                           |
| timestamp   | datetime     | When the activity occurred                     |
| endTime     | datetime?    | End time (for duration-based activities like naps) |
| details     | object       | Type-specific details (see below)              |
| notes       | string?      | Free-text notes from the provider              |
| reportedBy  | string?      | Name of the staff member who recorded it       |

### Activity Detail Types

#### DiaperDetails

| Field     | Type   | Description                          |
|-----------|--------|--------------------------------------|
| condition | string | "wet", "dry", "bm", or "wet+bm"     |

#### MealDetails

| Field    | Type     | Description                                 |
|----------|----------|---------------------------------------------|
| mealType | string   | "breakfast", "lunch", "snack", or "dinner"  |
| items    | string[] | Food items served                           |
| amount   | string?  | How much was consumed: "all", "most", "some", "none" |

#### NapDetails

| Field    | Type     | Description                       |
|----------|----------|-----------------------------------|
| duration | number?  | Duration in minutes (if ended)    |

#### IncidentDetails

| Field       | Type   | Description              |
|-------------|--------|--------------------------|
| description | string | What happened            |
| action      | string | Action taken by provider |

#### MedicationDetails

| Field      | Type   | Description          |
|------------|--------|----------------------|
| name       | string | Medication name      |
| dosage     | string | Dosage administered  |
| time       | string | Time administered    |

### DailySummary

Aggregated view of a child's day.

| Field        | Type       | Description                              |
|--------------|------------|------------------------------------------|
| childId      | string     | Reference to the child                   |
| date         | date       | The date summarized                      |
| checkIn      | datetime?  | Morning check-in time                    |
| checkOut     | datetime?  | Afternoon check-out time                 |
| activities   | Activity[] | All activities for the day               |
| diaperCount  | number     | Total diaper changes                     |
| naps         | Activity[] | Nap activities with durations            |
| meals        | Activity[] | Meals and snacks                         |
| notes        | string[]   | All notes from providers                 |

## Data Source Interface

The data provider must implement the following query capabilities. The concrete implementation will depend on whether we use the Procare API, parse email reports, or another method.

### Queries

| Query                  | Parameters                  | Returns        | Description                              |
|------------------------|-----------------------------|----------------|------------------------------------------|
| getChildren            | (none)                      | Child[]        | List all enrolled children               |
| getActivities          | childId, date?, type?       | Activity[]     | Get activities with optional filters     |
| getLatestActivity      | childId, type               | Activity?      | Most recent activity of a given type     |
| getDailySummary        | childId, date               | DailySummary   | Full day summary for a child             |
| getActivitiesInRange   | childId, startDate, endDate, type? | Activity[] | Activities within a date range    |

## Example Queries Mapped to Interface

| Natural language query                        | Interface call                                      |
|-----------------------------------------------|-----------------------------------------------------|
| "When did my child's diaper last get changed?" | `getLatestActivity(childId, "DIAPER")`             |
| "When did they last eat?"                      | `getLatestActivity(childId, "MEAL")`               |
| "How many diapers today?"                      | `getActivities(childId, today, "DIAPER").length`   |
| "What time did they check in?"                 | `getLatestActivity(childId, "CHECK_IN")`           |
| "How long was their nap?"                      | `getLatestActivity(childId, "NAP").details.duration`|
| "Give me a summary of today"                   | `getDailySummary(childId, today)`                  |
| "What did they eat for lunch?"                 | `getActivities(childId, today, "MEAL")` filtered by mealType |
