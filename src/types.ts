export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
  dateOfBirth: string; // ISO date string YYYY-MM-DD
}

export enum ActivityType {
  DIAPER = "DIAPER",
  MEAL = "MEAL",
  NAP = "NAP",
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT",
  INCIDENT = "INCIDENT",
  MEDICATION = "MEDICATION",
  PHOTO = "PHOTO",
  NOTE = "NOTE",
  LEARNING = "LEARNING",
}

export interface DiaperDetails {
  condition: "wet" | "dry" | "bm" | "wet+bm";
}

export interface MealDetails {
  mealType: "breakfast" | "lunch" | "snack" | "dinner";
  items: string[];
  amount?: "all" | "most" | "some" | "none";
}

export interface NapDetails {
  duration?: number; // minutes
}

export interface IncidentDetails {
  description: string;
  action: string;
}

export interface MedicationDetails {
  name: string;
  dosage: string;
  time: string;
}

export type ActivityDetails =
  | DiaperDetails
  | MealDetails
  | NapDetails
  | IncidentDetails
  | MedicationDetails
  | Record<string, unknown>;

export interface Activity {
  id: string;
  childId: string;
  type: ActivityType;
  timestamp: string; // ISO datetime string
  endTime?: string; // ISO datetime string
  details: ActivityDetails;
  notes?: string;
  reportedBy?: string;
}

export interface DailySummary {
  childId: string;
  date: string; // ISO date string YYYY-MM-DD
  checkIn?: string; // ISO datetime
  checkOut?: string; // ISO datetime
  activities: Activity[];
  diaperCount: number;
  naps: Activity[];
  meals: Activity[];
  notes: string[];
}
