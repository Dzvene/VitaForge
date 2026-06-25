import { api } from "@/lib/api/client";
import type {
  ActivityLevel,
  AdminStats,
  AdminUser,
  CalibrationStatus,
  DayGuidance,
  DaySummary,
  DiaryAddIn,
  DiaryEntryOut,
  EstimateResult,
  FoodCreate,
  FoodOut,
  GoalKind,
  Hint,
  ParamsView,
  ProfileOut,
  ProfileUpsert,
  Sex,
  TargetOut,
  TokenPair,
  UserOut,
  Warning,
  WeightSeries,
} from "@/lib/api/types";

// Guest preview inputs (no identity, no persistence — see backend public slice).
export interface PreviewProfile {
  sex: Sex;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  activity_level: ActivityLevel;
  goal: GoalKind;
  target_rate_kg_per_week: number;
  protein_g_per_kg?: number | null;
  protein_g_abs?: number | null;
  fat_g_per_kg?: number | null;
}

export interface PreviewWeightPoint {
  logged_on: string;
  weight_kg: number;
}
export interface PreviewIntake {
  day: string;
  kcal: number;
}

export const auth = {
  register: (body: { email: string; password: string; full_name?: string }) =>
    api<UserOut>("/auth/register", { method: "POST", body, auth: false }),
  login: (body: { email: string; password: string }) =>
    api<TokenPair>("/auth/login", { method: "POST", body, auth: false }),
  me: () => api<UserOut>("/auth/me"),
  forgotPassword: (email: string) =>
    api<{ status: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),
  resetPassword: (token: string, new_password: string) =>
    api<{ status: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, new_password },
      auth: false,
    }),
  verifyEmail: (token: string) =>
    api<{ status: string }>("/auth/verify-email", {
      method: "POST",
      body: { token },
      auth: false,
    }),
  resendVerification: () =>
    api<{ status: string }>("/auth/resend-verification", { method: "POST" }),
};

export const account = {
  exportData: () => api<Record<string, unknown>>("/account/export"),
  deleteAccount: (password: string) =>
    api<void>("/account/delete", { method: "POST", body: { password } }),
};

// Guest preview — stateless, no token (backend `app.modules.public`).
export const preview = {
  nutrition: (profile: PreviewProfile, maintenance_kcal?: number) =>
    api<TargetOut>("/public/nutrition/preview", {
      method: "POST",
      auth: false,
      body: { profile, maintenance_kcal: maintenance_kcal ?? null },
    }),
  weightTrend: (points: PreviewWeightPoint[]) =>
    api<WeightSeries>("/public/weight/trend", { method: "POST", auth: false, body: { points } }),
  calibration: (weights: PreviewWeightPoint[], intake: PreviewIntake[]) =>
    api<EstimateResult>("/public/calibration/preview", {
      method: "POST",
      auth: false,
      body: { weights, intake },
    }),
};

export const profile = {
  get: () => api<ProfileOut>("/profile"),
  upsert: (body: ProfileUpsert) => api<ProfileOut>("/profile", { method: "PUT", body }),
};

export const nutrition = {
  target: () => api<TargetOut>("/nutrition/target"),
  recompute: () => api<TargetOut>("/nutrition/recompute", { method: "POST" }),
};

export const foods = {
  search: (q: string) => api<FoodOut[]>("/foods/search", { query: { q } }),
  byBarcode: (barcode: string) => api<FoodOut>(`/foods/barcode/${barcode}`),
  favorites: () => api<FoodOut[]>("/foods/favorites"),
  get: (id: number) => api<FoodOut>(`/foods/${id}`),
  createCustom: (body: FoodCreate) => api<FoodOut>("/foods", { method: "POST", body }),
  addFavorite: (id: number) =>
    api<void>(`/foods/${id}/favorite`, { method: "PUT" }),
  removeFavorite: (id: number) =>
    api<void>(`/foods/${id}/favorite`, { method: "DELETE" }),
};

export const diary = {
  day: (day: string) => api<DaySummary>(`/diary/${day}`),
  add: (body: DiaryAddIn) => api<DiaryEntryOut>("/diary", { method: "POST", body }),
  remove: (id: number) => api<void>(`/diary/${id}`, { method: "DELETE" }),
  recentFoods: () => api<FoodOut[]>("/diary/recent-foods"),
  copy: (src: string, dst: string) =>
    api<{ copied: number }>("/diary/copy", { method: "POST", query: { src, dst } }),
};

export const weight = {
  log: (body: { logged_on: string; weight_kg: number }) =>
    api<void>("/weight", { method: "POST", body }),
  series: () => api<WeightSeries>("/weight/series"),
};

export const calibration = {
  status: () => api<CalibrationStatus>("/calibration/status"),
  estimate: () => api<EstimateResult>("/calibration/estimate", { method: "POST" }),
  recalc: () => api<EstimateResult>("/calibration/recalc", { method: "POST" }),
  skip: () => api<EstimateResult>("/calibration/skip", { method: "POST" }),
};

export const coaching = {
  hints: () => api<Hint[]>("/coaching/hints"),
  warnings: () => api<Warning[]>("/coaching/warnings"),
  dayGuidance: (day: string) => api<DayGuidance>(`/coaching/day-guidance/${day}`),
  accept: (type: string) =>
    api<void>(`/coaching/warnings/${type}/accept`, { method: "POST" }),
  dismiss: (type: string) =>
    api<void>(`/coaching/warnings/${type}/dismiss`, { method: "POST" }),
};

export const admin = {
  stats: () => api<AdminStats>("/admin/stats"),
  users: () => api<AdminUser[]>("/admin/users"),
  patchUser: (id: number, body: { role?: string; is_active?: boolean }) =>
    api<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body }),
  foods: (q?: string) =>
    api<FoodOut[]>("/admin/foods", { query: { q, limit: 100 } }),
  createFood: (body: FoodCreate) =>
    api<FoodOut>("/admin/foods", { method: "POST", body }),
  updateFood: (id: number, body: FoodCreate) =>
    api<FoodOut>(`/admin/foods/${id}`, { method: "PUT", body }),
  deleteFood: (id: number) => api<void>(`/admin/foods/${id}`, { method: "DELETE" }),
  getParams: () => api<ParamsView>("/admin/params"),
  setParams: (overrides: Record<string, unknown>) =>
    api<ParamsView>("/admin/params", { method: "PUT", body: { overrides } }),
};
