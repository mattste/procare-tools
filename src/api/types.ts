export interface ProcareUser {
  id: string;
  email?: string;
  role?: string;
  school_id?: string;
  auth_token?: string;
  family_id?: string;
  [key: string]: unknown;
}

export interface ProcareKid {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  current_section_id?: string;
  current_section_name?: string;
  registration_status?: string;
  time_schedule?: Record<string, string[]>;
  [key: string]: unknown;
}

export interface ProcareListOptionItem {
  label?: string;
  value?: string;
  [key: string]: unknown;
}

export interface ProcareListOptions {
  meal_types?: ProcareListOptionItem[];
  meal_quantities?: ProcareListOptionItem[];
  diaper_types?: ProcareListOptionItem[];
  activity_types?: ProcareListOptionItem[];
  [key: string]: unknown;
}

export interface ProcareLearningCategory {
  value?: string;
  [key: string]: unknown;
}

export interface ProcareLearningActivityName {
  value?: string;
  [key: string]: unknown;
}

export interface ProcareActivityData {
  type?: string;
  sub_type?: string;
  quantity?: string;
  desc?: string;
  amount?: string;
  bottle_consumed?: string;
  start_time?: string;
  end_time?: string;
  [key: string]: unknown;
}

export interface ProcareActivityActiviable {
  sign_in_time?: string;
  sign_out_time?: string;
  signed_in_by?: string;
  signed_out_by?: string;
  section?: { name?: string; [key: string]: unknown };
  learning_activity_name?: ProcareLearningActivityName;
  learning_activity_categories?: ProcareLearningCategory[];
  [key: string]: unknown;
}

export interface ProcareDailyActivity {
  id: string;
  activity_time: string;
  activity_date: string;
  activity_type: string;
  data?: ProcareActivityData;
  comment?: string;
  staff_present_name?: string;
  kid_ids: string[];
  photo_url?: string | null;
  activiable?: ProcareActivityActiviable;
  [key: string]: unknown;
}

export interface ProcareKidsResponse {
  kids: ProcareKid[];
}

export interface ProcareDailyActivitiesResponse {
  page: number;
  per_page: number;
  daily_activities: ProcareDailyActivity[];
}
