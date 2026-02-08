import { ActivityType } from "../../types.js";
import type { Activity, Child } from "../../types.js";

export const CHILD_EMMA: Child = {
  id: "child-001",
  firstName: "Emma",
  lastName: "Smith",
  classroom: "Butterflies",
  dateOfBirth: "2023-03-15",
};

export const CHILD_LIAM: Child = {
  id: "child-002",
  firstName: "Liam",
  lastName: "Johnson",
  classroom: "Ladybugs",
  dateOfBirth: "2022-11-02",
};

/** A full realistic day for Emma on 2025-01-15. */
export function emmaFullDay(date = "2025-01-15"): Activity[] {
  return [
    {
      id: `act-${date}-001`,
      childId: CHILD_EMMA.id,
      type: ActivityType.CHECK_IN,
      timestamp: `${date}T08:05:00`,
      details: {},
      reportedBy: "Ms. Johnson",
    },
    {
      id: `act-${date}-002`,
      childId: CHILD_EMMA.id,
      type: ActivityType.MEAL,
      timestamp: `${date}T08:30:00`,
      details: {
        mealType: "breakfast",
        items: ["oatmeal", "banana slices", "milk"],
        amount: "all",
      },
      notes: "Great appetite this morning!",
      reportedBy: "Ms. Johnson",
    },
    {
      id: `act-${date}-003`,
      childId: CHILD_EMMA.id,
      type: ActivityType.DIAPER,
      timestamp: `${date}T09:15:00`,
      details: { condition: "wet" },
      reportedBy: "Ms. Garcia",
    },
    {
      id: `act-${date}-004`,
      childId: CHILD_EMMA.id,
      type: ActivityType.NAP,
      timestamp: `${date}T10:00:00`,
      endTime: `${date}T11:15:00`,
      details: { duration: 75 },
      notes: "Fell asleep quickly",
      reportedBy: "Ms. Johnson",
    },
    {
      id: `act-${date}-005`,
      childId: CHILD_EMMA.id,
      type: ActivityType.DIAPER,
      timestamp: `${date}T11:20:00`,
      details: { condition: "wet+bm" },
      reportedBy: "Ms. Garcia",
    },
    {
      id: `act-${date}-006`,
      childId: CHILD_EMMA.id,
      type: ActivityType.MEAL,
      timestamp: `${date}T11:45:00`,
      details: {
        mealType: "lunch",
        items: ["chicken", "rice", "peas"],
        amount: "most",
      },
      reportedBy: "Ms. Johnson",
    },
    {
      id: `act-${date}-007`,
      childId: CHILD_EMMA.id,
      type: ActivityType.DIAPER,
      timestamp: `${date}T13:30:00`,
      details: { condition: "wet" },
      reportedBy: "Ms. Garcia",
    },
    {
      id: `act-${date}-008`,
      childId: CHILD_EMMA.id,
      type: ActivityType.MEAL,
      timestamp: `${date}T15:00:00`,
      details: {
        mealType: "snack",
        items: ["crackers", "apple slices"],
        amount: "some",
      },
      reportedBy: "Ms. Johnson",
    },
    {
      id: `act-${date}-009`,
      childId: CHILD_EMMA.id,
      type: ActivityType.NOTE,
      timestamp: `${date}T15:30:00`,
      details: {},
      notes: "Emma loved playing with blocks today and built a tall tower!",
      reportedBy: "Ms. Johnson",
    },
    {
      id: `act-${date}-010`,
      childId: CHILD_EMMA.id,
      type: ActivityType.CHECK_OUT,
      timestamp: `${date}T17:15:00`,
      details: {},
      reportedBy: "Ms. Johnson",
    },
  ];
}

/** A partial day for Liam — useful for testing multi-child scenarios. */
export function liamPartialDay(date = "2025-01-15"): Activity[] {
  return [
    {
      id: `act-liam-${date}-001`,
      childId: CHILD_LIAM.id,
      type: ActivityType.CHECK_IN,
      timestamp: `${date}T07:45:00`,
      details: {},
      reportedBy: "Mr. Davis",
    },
    {
      id: `act-liam-${date}-002`,
      childId: CHILD_LIAM.id,
      type: ActivityType.MEAL,
      timestamp: `${date}T08:15:00`,
      details: {
        mealType: "breakfast",
        items: ["pancakes", "strawberries"],
        amount: "all",
      },
      reportedBy: "Mr. Davis",
    },
    {
      id: `act-liam-${date}-003`,
      childId: CHILD_LIAM.id,
      type: ActivityType.DIAPER,
      timestamp: `${date}T09:00:00`,
      details: { condition: "bm" },
      reportedBy: "Mr. Davis",
    },
  ];
}

export function emmaBottleActivity(date = "2025-01-15"): Activity {
  return {
    id: `act-${date}-bottle-001`,
    childId: CHILD_EMMA.id,
    type: ActivityType.BOTTLE,
    timestamp: `${date}T14:15:00`,
    details: {
      amount: 4,
      bottleConsumed: 3,
    },
    reportedBy: "Ms. Johnson",
  };
}

export function emmaLearningActivity(date = "2025-01-15"): Activity {
  return {
    id: `act-${date}-learning-001`,
    childId: CHILD_EMMA.id,
    type: ActivityType.LEARNING,
    timestamp: `${date}T10:30:00`,
    details: {
      activityName: "Circle Time",
      categories: ["Language", "Social"],
      photoUrl: "https://example.com/photos/circle-time.jpg",
    },
    notes: "Participated in songs and story time.",
    reportedBy: "Ms. Garcia",
  };
}
