import axios from 'axios';
import {
  BiometricPayload,
  CoachResponse,
  StrategyProfile,
  DayMacroTarget,
  GoalType,
  CoachingMode,
  DietStyle,
  ProteinPreference,
  CheckInResult,
} from '../types/schema';
import { WorkoutPlan, DietPlan, SleepGoal } from '../types/plans';

// Set to deployed Render URL for production, or empty string for local development with adb reverse:
export const RENDER_BACKEND_URL = '';

// When RENDER_BACKEND_URL is set, it will connect directly over HTTPS without adb reverse
export const BASE_URL = RENDER_BACKEND_URL.trim().length > 0 
  ? RENDER_BACKEND_URL 
  : 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Multi-agent chains (sleep → workout → diet) can take 30-60s on free-tier LLMs.
  timeout: 90000,
});

// Auto-fallback between localhost (adb reverse) and 10.0.2.2 (Android emulator loopback)
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      (typeof error.message === 'string' && error.message.toLowerCase().includes('network error'));

    if (isNetworkError && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const currentBase = originalRequest.baseURL || BASE_URL;
      let fallbackBase = 'http://localhost:8000';
      if (currentBase.includes('localhost:8000')) {
        fallbackBase = 'http://10.0.2.2:8000';
      } else if (currentBase.includes('10.0.2.2:8000')) {
        fallbackBase = 'http://localhost:8000';
      }

      console.warn(`[apiClient] Network error on ${currentBase}. Cascading fallback to ${fallbackBase}...`);
      originalRequest.baseURL = fallbackBase;
      apiClient.defaults.baseURL = fallbackBase;
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);

// ─── Conversational Chat ──────────────────────────────────────────────────────

export const sendBiometricsAndMessage = async (
  payload: BiometricPayload
): Promise<CoachResponse> => {
  const response = await apiClient.post<CoachResponse>('/api/v1/chat', payload);
  return response.data;
};

export interface ReadinessResponse {
  readiness_score: number;
  fatigue_flag: string;
  sleep_hours: number;
  steps_today: number;
  active_calories_burned: number;
  resting_heart_rate_bpm: number;
}

export const computeReadiness = async (
  steps_today: number,
  sleep_minutes: number,
  active_calories_burned = 0,
  resting_heart_rate_bpm = 0,
): Promise<ReadinessResponse> => {
  const response = await apiClient.post<ReadinessResponse>('/api/v1/readiness', {
    steps_today,
    sleep_minutes,
    active_calories_burned,
    resting_heart_rate_bpm,
  });
  return response.data;
};

// ─── Structured Plan Normalizers (snake_case -> camelCase) ────────────────────

function normalizeWorkoutPlan(raw: any): WorkoutPlan {
  return {
    planId: raw?.planId ?? raw?.plan_id ?? `wp_${Date.now()}`,
    generatedAt: raw?.generatedAt ?? raw?.generated_at ?? new Date().toISOString(),
    durationWeeks: raw?.durationWeeks ?? raw?.duration_weeks ?? 1,
    fitnessGoal: raw?.fitnessGoal ?? raw?.fitness_goal ?? 'general_fitness',
    days: (raw?.days ?? []).map((d: any) => ({
      day: d?.day ?? '',
      targetMuscleGroups: d?.targetMuscleGroups ?? d?.target_muscle_groups ?? [],
      exercises: (d?.exercises ?? []).map((e: any) => ({
        name: e?.name ?? '',
        sets: Number(e?.sets ?? 0),
        reps: e?.reps ?? '',
        rpe: e?.rpe != null ? Number(e.rpe) : undefined,
        restSeconds: e?.restSeconds ?? e?.rest_seconds ?? undefined,
        notes: e?.notes ?? undefined,
      })),
    })),
  };
}

function normalizeDietPlan(raw: any): DietPlan {
  const macro = raw?.macroSplit ?? raw?.macro_split ?? {};
  return {
    planId: raw?.planId ?? raw?.plan_id ?? `dp_${Date.now()}`,
    generatedAt: raw?.generatedAt ?? raw?.generated_at ?? new Date().toISOString(),
    dailyCalories: raw?.dailyCalories ?? raw?.daily_calories ?? 2000,
    macroSplit: {
      proteinG: macro?.proteinG ?? macro?.protein_g ?? 0,
      carbsG: macro?.carbsG ?? macro?.carbs_g ?? 0,
      fatsG: macro?.fatsG ?? macro?.fats_g ?? 0,
    },
    dietaryPreference: raw?.dietaryPreference ?? raw?.dietary_preference ?? 'omnivore',
    meals: (raw?.meals ?? []).map((m: any) => ({
      time: m?.time ?? '',
      description: m?.description ?? '',
      proteinG: m?.proteinG ?? m?.protein_g ?? 0,
      carbsG: m?.carbsG ?? m?.carbs_g ?? 0,
      fatsG: m?.fatsG ?? m?.fats_g ?? 0,
      calories: m?.calories ?? 0,
    })),
    hydrationLiters: raw?.hydrationLiters ?? raw?.hydration_liters ?? 2.5,
  };
}

function normalizeSleepGoal(raw: any): SleepGoal {
  return {
    planId: raw?.planId ?? raw?.plan_id ?? `sg_${Date.now()}`,
    generatedAt: raw?.generatedAt ?? raw?.generated_at ?? new Date().toISOString(),
    targetBedtime: raw?.targetBedtime ?? raw?.target_bedtime ?? '23:00',
    targetWakeTime: raw?.targetWakeTime ?? raw?.target_wake_time ?? '07:00',
    targetDurationHours: raw?.targetDurationHours ?? raw?.target_duration_hours ?? 8,
    windDownMilestones: raw?.windDownMilestones ?? raw?.wind_down_milestones ?? [],
    recoveryScoreThreshold: raw?.recoveryScoreThreshold ?? raw?.recovery_score_threshold ?? 70,
  };
}

// ─── Structured Plan Generation ───────────────────────────────────────────────

export interface PlanRequest {
  user_id: string;
  steps_today?: number;
  sleep_minutes?: number;
  active_calories_burned?: number;
  resting_heart_rate_bpm?: number;
  readiness_score?: number;
  user_profile?: Record<string, unknown>;
  daily_log?: Record<string, unknown>;
  context_message?: string;
}

export const generateWorkoutPlan = async (payload: PlanRequest): Promise<WorkoutPlan> => {
  const response = await apiClient.post('/api/v1/plan/workout', payload);
  return normalizeWorkoutPlan(response.data);
};

export const generateDietPlan = async (payload: PlanRequest): Promise<DietPlan> => {
  const response = await apiClient.post('/api/v1/plan/diet', payload);
  return normalizeDietPlan(response.data);
};

export const generateSleepGoal = async (payload: PlanRequest): Promise<SleepGoal> => {
  const response = await apiClient.post('/api/v1/plan/sleep', payload);
  return normalizeSleepGoal(response.data);
};
// ─── Nutrition Logging ────────────────────────────────────────────────────────

export interface MealItem {
  meal_id?: string;
  name: string;
  category: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  logged_at?: string;
}

export interface NutritionDay {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  meals: MealItem[];
}

export const logMealToServer = async (userId: string, meal: MealItem): Promise<NutritionDay> => {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await apiClient.post<NutritionDay>('/api/v1/nutrition/log', {
    user_id: userId, date: today, name: meal.name, category: meal.category,
    time: meal.time, calories: meal.calories, protein_g: meal.protein_g,
    carbs_g: meal.carbs_g, fats_g: meal.fats_g,
  });
  return data;
};

export const getTodayNutrition = async (userId: string): Promise<NutritionDay> => {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await apiClient.get<NutritionDay>('/api/v1/nutrition/today', {
    params: { user_id: userId, date: today },
  });
  return data;
};

export const estimateMealMacros = async (
  foodDescription: string,
): Promise<{ name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number }> => {
  const { data } = await apiClient.post('/api/v1/nutrition/estimate', { food_description: foodDescription });
  return data;
};

// ─── Profile Sync to MongoDB Atlas ───────────────────────────────────────────

export interface ProfileSyncResponse {
  status: string;
  targets: { bmr: number; tdee: number; target_calories: number; target_protein_g: number; target_carbs_g: number; target_fats_g: number };
}

export const syncProfileToServer = async (
  profile: Record<string, unknown>,
  userId = 'usr_dev_1',
): Promise<ProfileSyncResponse> => {
  const { data } = await apiClient.put<ProfileSyncResponse>('/api/v1/user/profile', { user_id: userId, ...profile });
  return data;
};

// ─── Weigh-In ─────────────────────────────────────────────────────────────────

export const logWeighIn = async (userId: string, weightKg: number): Promise<void> => {
  const tzOffset = new Date().getTimezoneOffset();
  await apiClient.post('/api/v1/fitness/weigh-in', {
    user_id: userId,
    scale_weight_kg: weightKg,
    tz_offset: tzOffset,
  });
};

// ─── Unified Fitness & Habits API ─────────────────────────────────────────────

export interface TodayFitnessData {
  date_id: string;
  calorie_goal: number;
  protein_goal_g: number;
  total_calories_consumed: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  total_calories_burned: number;
  scale_weight_kg: number | null;
  meals: MealItem[];
  is_completed: boolean;
}

export interface HabitsHistoryData {
  days: number;
  weigh_in_history: boolean[];
  weigh_in_stat: string;
  food_log_history: boolean[];
  food_log_stat: string;
}

export const getTodayFitness = async (userId = 'usr_dev_1'): Promise<TodayFitnessData> => {
  const tzOffset = new Date().getTimezoneOffset();
  const { data } = await apiClient.get<{ success: boolean; data: TodayFitnessData }>(
    '/api/v1/fitness/today',
    { params: { user_id: userId, tz_offset: tzOffset } }
  );
  return data.data;
};

export const getHabitsHistory = async (userId = 'usr_dev_1', days = 28): Promise<HabitsHistoryData> => {
  const tzOffset = new Date().getTimezoneOffset();
  const { data } = await apiClient.get<{ success: boolean; data: HabitsHistoryData }>(
    '/api/v1/fitness/history',
    { params: { user_id: userId, days, tz_offset: tzOffset } }
  );
  return data.data;
};

export const logFitnessMeal = async (userId: string, meal: MealItem): Promise<TodayFitnessData> => {
  const tzOffset = new Date().getTimezoneOffset();
  const { data } = await apiClient.post<{ success: boolean; data: TodayFitnessData }>(
    '/api/v1/fitness/food-log',
    {
      user_id: userId,
      name: meal.name,
      category: meal.category,
      time: meal.time,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fats_g: meal.fats_g,
      tz_offset: tzOffset,
    }
  );
  return data.data;
};

// ─── Strategy Command Center API ─────────────────────────────────────────────

export const getStrategyProfile = async (userId = 'usr_dev_1'): Promise<StrategyProfile> => {
  const { data } = await apiClient.get<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/profile',
    { params: { user_id: userId } }
  );
  return data.data;
};

export const updateStrategyGoal = async (params: {
  userId?: string;
  goal_type: GoalType;
  target_weight_kg: number;
  starting_weight_kg?: number;
  current_weight_kg?: number;
  weekly_rate_percent: number;
}): Promise<StrategyProfile> => {
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/goal',
    {
      user_id: params.userId || 'usr_dev_1',
      goal_type: params.goal_type,
      target_weight_kg: params.target_weight_kg,
      starting_weight_kg: params.starting_weight_kg,
      current_weight_kg: params.current_weight_kg,
      weekly_rate_percent: params.weekly_rate_percent,
    }
  );
  return data.data;
};

export const updateStrategyMode = async (
  userId = 'usr_dev_1',
  coachingMode: CoachingMode
): Promise<StrategyProfile> => {
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/mode',
    {
      user_id: userId,
      coaching_mode: coachingMode,
    }
  );
  return data.data;
};

export const updateDietStyle = async (params: {
  userId?: string;
  diet_style: DietStyle;
  protein_preference?: ProteinPreference;
  use_day_variation?: boolean;
  training_days?: string[];
}): Promise<StrategyProfile> => {
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/diet-style',
    {
      user_id: params.userId || 'usr_dev_1',
      diet_style: params.diet_style,
      protein_preference: params.protein_preference || 'moderate',
      use_day_variation: params.use_day_variation ?? false,
      training_days: params.training_days,
    }
  );
  return data.data;
};

export const updateScheduleTargets = async (
  userId = 'usr_dev_1',
  scheduleTargets: DayMacroTarget[]
): Promise<StrategyProfile> => {
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/schedule',
    {
      user_id: userId,
      schedule_targets: scheduleTargets,
    }
  );
  return data.data;
};

export const updateManualTargets = async (
  userId = 'usr_dev_1',
  targets: {
    target_calories: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fats_g: number;
  }
): Promise<StrategyProfile> => {
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/manual-targets',
    {
      user_id: userId,
      ...targets,
    }
  );
  return data.data;
};

export const performWeeklyCheckIn = async (userId = 'usr_dev_1'): Promise<CheckInResult> => {
  const { data } = await apiClient.post<CheckInResult>(
    '/api/v1/strategy/check-in',
    { user_id: userId }
  );
  return data;
};

