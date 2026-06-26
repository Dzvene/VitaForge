// Typed mirror of the backend DTOs (backend/app/modules/*/schemas.py).
// Kept hand-written (no codegen) — small, stable, and explicit.

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "high"
  | "very_high";
export type GoalKind = "lose" | "maintain" | "gain";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

// ----- auth -----
export interface UserOut {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
}
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ----- profile -----
export interface ProfileUpsert {
  sex: Sex;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  activity_level: ActivityLevel;
  goal: GoalKind;
  target_rate_kg_per_week: number;
  target_weight_kg?: number | null;
  protein_g_per_kg?: number | null;
  protein_g_abs?: number | null;
  fat_g_per_kg?: number | null;
  param_overrides?: Record<string, unknown> | null;
}
export interface ProfileOut extends ProfileUpsert {
  id: number;
  user_id: number;
}

// ----- nutrition -----
export interface TargetOut {
  target_calories: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  maintenance_kcal: number;
  maintenance_source: "formula" | "calibrated";
  calibrated: boolean;
  rate_clamped: boolean;
}

// ----- foods -----
export interface PortionOut {
  id: number;
  name: string;
  grams: number;
}
export interface FoodOut {
  id: number;
  source: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcal_100g: number;
  protein_100g: number;
  fat_100g: number;
  carb_100g: number;
  portions: PortionOut[];
}
export interface FoodCreate {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  kcal_100g: number;
  protein_100g: number;
  fat_100g: number;
  carb_100g: number;
  portions: { name: string; grams: number }[];
}

// ----- diary -----
export interface Nutrients {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
}
export interface DiaryAddIn {
  entry_date: string; // YYYY-MM-DD
  meal: Meal;
  food_id: number;
  grams?: number | null;
  portion_id?: number | null;
  portion_count?: number | null;
}
export interface DiaryEntryOut {
  id: number;
  entry_date: string;
  meal: Meal;
  food_id: number;
  food_name: string;
  grams: number;
  nutrients: Nutrients;
}
export interface MacroQuad {
  calories: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
}
export interface DaySummary {
  entry_date: string;
  eaten: Nutrients;
  target: MacroQuad;
  remaining: MacroQuad;
  entries: DiaryEntryOut[];
}

// ----- weight -----
export interface WeightPoint {
  logged_on: string;
  weight_kg: number;
  trend_kg: number;
}
export interface WeightSeries {
  points: WeightPoint[];
  latest_trend_kg: number | null;
}

// ----- calibration -----
export interface CalibrationStatus {
  phase: "calibrating" | "completed";
  started_on: string;
  window_days: number;
  clean_days_collected: number;
  days_remaining: number;
  ready_to_estimate: boolean;
  last_real_tdee: number | null;
}
export interface EstimateResult {
  ok: boolean;
  reason?: string | null;
  real_tdee?: number | null;
  avg_daily_intake?: number | null;
  trend_change_kg?: number | null;
  days?: number | null;
  target_calories?: number | null;
}

// ----- coaching -----
export interface Hint {
  key: string;
  title: string;
  body: string;
}
export interface Warning {
  type: string;
  title: string;
  message: string;
  auto_show: boolean;
}
export interface GuidanceItem {
  kind: "protein_low" | "fat_high" | "carb_room" | "on_track" | "overage";
  message: string;
}
export interface DayGuidance {
  items: GuidanceItem[];
}

// ----- admin -----
export interface AdminStats {
  users: number;
  active_users: number;
  admins: number;
  foods: number;
  custom_foods: number;
  diary_entries: number;
  weight_logs: number;
}
export interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}
export interface ParamsView {
  effective: Record<string, number | string | boolean | Record<string, number>>;
  overrides: Record<string, unknown>;
}
export interface LegalSectionOut {
  heading: string;
  body: string[];
}
export interface LegalContentOut {
  doc: string;
  locale: string;
  title: string;
  intro: string | null;
  updated: string;
  sections: LegalSectionOut[];
  customized: boolean;
}
export interface MacroAverages {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
}
export interface PeriodSummary {
  range: string;
  start: string;
  end: string;
  days_total: number;
  days_logged: number;
  logging_adherence_pct: number;
  avg: MacroAverages | null;
  on_target_days: number;
  on_target_pct: number | null;
  avg_kcal_delta: number | null;
  weight_change_kg: number | null;
  weekly_rate_kg: number | null;
}
export interface IntakePoint {
  day: string;
  logged: boolean;
  kcal: number | null;
  protein_g: number | null;
}
export interface PaceOut {
  goal: string;
  target_rate_kg_per_week: number;
  actual_rate_kg_per_week: number | null;
  on_pace_pct: number | null;
}
export interface GoalOut {
  status: "no_target" | "no_data" | "reached" | "on_track" | "off_track" | "stalled";
  target_weight_kg: number | null;
  start_weight_kg: number | null;
  current_weight_kg: number | null;
  remaining_kg: number | null;
  progress_pct: number | null;
  eta_weeks: number | null;
  eta_date: string | null;
}
export interface TrendsOut {
  target_kcal: number;
  target_protein_g: number;
  target_fat_g: number;
  target_carb_g: number;
  week: PeriodSummary;
  month: PeriodSummary;
  daily: IntakePoint[];
  pace: PaceOut | null;
  goal: GoalOut;
}
