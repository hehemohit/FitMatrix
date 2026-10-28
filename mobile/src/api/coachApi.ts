import axios from 'axios';
import { createMMKV, type MMKV } from 'react-native-mmkv';
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

import { API_BASE_URL, IS_PRODUCTION, LAN_API_URL } from '../config/env';

const authStorage: MMKV = createMMKV({ id: 'fitmatrix-auth-store' });

export const getActiveUserIdFromAuth = (): string => {
  try {
    const raw = authStorage.getString('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.userId) return u.userId;
    }
  } catch {}
  return 'local_user';
};

// Dynamically loaded from mobile/.env via react-native-dotenv
export const BASE_URL = API_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Multi-agent chains (sleep → workout → diet) can take 30-60s on free-tier LLMs.
  timeout: 90000,
});

let currentAuthToken: string | null = null;
export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

// Automatically attach Bearer token to all outgoing requests
apiClient.interceptors.request.use(config => {
  if (currentAuthToken) {
    config.headers.Authorization = `Bearer ${currentAuthToken}`;
  }
  return config;
});

// Network resilience: Auto-retry cloud cold-start; local dev fallback without ADB dependence
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

      // In production/cloud mode, retry once after a short delay (e.g. Render server cold-start)
      // NEVER downgrade a standalone APK to localhost:8000
      if (IS_PRODUCTION || currentBase.startsWith('https://')) {
        console.warn(`[apiClient] Network timeout/blip on cloud backend (${currentBase}). Retrying in 2s...`);
        await new Promise<void>(res => setTimeout(() => res(), 2000));
        return apiClient(originalRequest);
      }

      // In local dev mode, cycle between LAN IP (no ADB needed), Android emulator loopback, and localhost
      let fallbackBase = LAN_API_URL;
      if (currentBase === LAN_API_URL) {
        fallbackBase = 'http://10.0.2.2:8000';
      } else if (currentBase.includes('10.0.2.2:8000')) {
        fallbackBase = 'http://localhost:8000';
      } else {
        fallbackBase = LAN_API_URL;
      }

      console.warn(`[apiClient] Local network error on ${currentBase}. Retrying with ${fallbackBase}...`);
      originalRequest.baseURL = fallbackBase;
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

export interface ChatHistoryResponse {
  status: string;
  messages: Array<{
    role: 'user' | 'coach';
    content: string;
    timestamp?: string;
  }>;
  current_topic?: string | null;
}

export const getChatHistory = async (userId: string = 'local_user'): Promise<ChatHistoryResponse> => {
  try {
    const response = await apiClient.get<ChatHistoryResponse>(`/api/v1/chat/history?user_id=${encodeURIComponent(userId)}`);
    return response.data;
  } catch (err) {
    return { status: 'fallback', messages: [], current_topic: null };
  }
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
): Promise<{ name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number; serving_size?: string; cached?: boolean }> => {
  const { data } = await apiClient.post('/api/v1/nutrition/estimate', { food_description: foodDescription });
  return data;
};

// ─── Barcode & Vision Scanner API ─────────────────────────────────────────────

export interface BarcodeProduct {
  status: 'found' | 'not_found';
  source?: 'custom_database' | 'open_food_facts';
  barcode: string;
  product_name?: string;
  brand?: string;
  serving_size?: string;
  serving_size_g?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  image_url?: string;
  message?: string;
}

export interface CustomBarcodePayload {
  barcode: string;
  product_name: string;
  brand?: string;
  serving_size?: string;
  serving_size_g?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  image_url?: string;
  user_id?: string;
}

export interface VisionIngredientItem {
  name: string;
  portion_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface VisionEstimateResponse {
  dish_name: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning_note: string;
  items: VisionIngredientItem[];
}

export const fetchBarcodeNutrition = async (barcode: string): Promise<BarcodeProduct> => {
  const { data } = await apiClient.get<BarcodeProduct>(`/api/v1/nutrition/barcode/${encodeURIComponent(barcode)}`);
  return data;
};

export const saveCustomBarcodeToServer = async (payload: CustomBarcodePayload): Promise<{ status: string; barcode: string }> => {
  const { data } = await apiClient.post<{ status: string; barcode: string }>('/api/v1/nutrition/barcode/custom', payload);
  return data;
};

export interface MealImageUpload {
  uri: string;
  type?: string;
  fileName?: string;
}

export const estimateVisionMealMacros = async (
  imageInput: MealImageUpload | string,
  mealHint?: string,
): Promise<VisionEstimateResponse> => {
  if (typeof imageInput === 'object' && imageInput.uri) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageInput.uri,
      type: imageInput.type || 'image/jpeg',
      name: imageInput.fileName || 'meal.jpg',
    } as any);

    if (mealHint?.trim()) {
      formData.append('meal_hint', mealHint.trim());
    }

    const { data } = await apiClient.post<VisionEstimateResponse>(
      '/api/v1/nutrition/vision-estimate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  }

  // Fallback for Base64 string if provided
  const { data } = await apiClient.post<VisionEstimateResponse>('/api/v1/nutrition/vision-estimate', {
    image_base64: imageInput,
    meal_hint: mealHint?.trim() || undefined,
  });
  return data;
};

// ─── Profile Sync to MongoDB Atlas ───────────────────────────────────────────

export interface ProfileSyncResponse {
  status: string;
  targets: { bmr: number; tdee: number; target_calories: number; target_protein_g: number; target_carbs_g: number; target_fats_g: number };
}

export const syncProfileToServer = async (
  profile: Record<string, unknown>,
  userId?: string,
): Promise<ProfileSyncResponse> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.put<ProfileSyncResponse>('/api/v1/user/profile', { user_id: targetId, ...profile });
  return data;
};

// ─── Weigh-In ─────────────────────────────────────────────────────────────────

export const logWeighIn = async (userId?: string, weightKg: number = 75.0): Promise<void> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const tzOffset = new Date().getTimezoneOffset();
  await apiClient.post('/api/v1/fitness/weigh-in', {
    user_id: targetId,
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

export const getTodayFitness = async (userId?: string): Promise<TodayFitnessData> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const tzOffset = new Date().getTimezoneOffset();
  const { data } = await apiClient.get<{ success: boolean; data: TodayFitnessData }>(
    '/api/v1/fitness/today',
    { params: { user_id: targetId, tz_offset: tzOffset } }
  );
  return data.data;
};

export const getHabitsHistory = async (userId?: string, days = 28): Promise<HabitsHistoryData> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const tzOffset = new Date().getTimezoneOffset();
  const { data } = await apiClient.get<{ success: boolean; data: HabitsHistoryData }>(
    '/api/v1/fitness/history',
    { params: { user_id: targetId, days, tz_offset: tzOffset } }
  );
  return data.data;
};

export const logFitnessMeal = async (userId?: string, meal?: MealItem): Promise<TodayFitnessData> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const tzOffset = new Date().getTimezoneOffset();
  const { data } = await apiClient.post<{ success: boolean; data: TodayFitnessData }>(
    '/api/v1/fitness/food-log',
    {
      user_id: targetId,
      name: meal?.name || 'Meal',
      category: meal?.category || 'Lunch',
      time: meal?.time || '12:00',
      calories: meal?.calories || 0,
      protein_g: meal?.protein_g || 0,
      carbs_g: meal?.carbs_g || 0,
      fats_g: meal?.fats_g || 0,
      tz_offset: tzOffset,
    }
  );
  return data.data;
};

// ─── Strategy Command Center API ─────────────────────────────────────────────

export const getStrategyProfile = async (userId?: string): Promise<StrategyProfile> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.get<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/profile',
    { params: { user_id: targetId } }
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
  const targetId = params.userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/goal',
    {
      user_id: targetId,
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
  userId?: string,
  coachingMode?: CoachingMode
): Promise<StrategyProfile> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/mode',
    {
      user_id: targetId,
      coaching_mode: coachingMode || 'coached',
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
  const targetId = params.userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/diet-style',
    {
      user_id: targetId,
      diet_style: params.diet_style,
      protein_preference: params.protein_preference || 'moderate',
      use_day_variation: params.use_day_variation ?? false,
      training_days: params.training_days,
    }
  );
  return data.data;
};

export const updateScheduleTargets = async (
  userId?: string,
  scheduleTargets?: DayMacroTarget[]
): Promise<StrategyProfile> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/schedule',
    {
      user_id: targetId,
      schedule_targets: scheduleTargets || [],
    }
  );
  return data.data;
};

export const updateManualTargets = async (
  userId?: string,
  targets?: {
    target_calories: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fats_g: number;
  }
): Promise<StrategyProfile> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.put<{ success: boolean; data: StrategyProfile }>(
    '/api/v1/strategy/manual-targets',
    {
      user_id: targetId,
      ...(targets || {}),
    }
  );
  return data.data;
};

export const performWeeklyCheckIn = async (userId?: string): Promise<CheckInResult> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.post<CheckInResult>(
    '/api/v1/strategy/check-in',
    { user_id: targetId }
  );
  return data;
};

// ─── Ambient Morning Physiological Briefing API ───────────────────────────────

export interface AmbientBriefingData {
  user_id: string;
  date_id: string;
  readiness_score: number;
  fatigue_flag: string;
  sleep_hours: number;
  steps_today: number;
  resting_heart_rate_bpm: number;
  headline: string;
  briefing_text: string;
  prescribed_workout: string;
  peri_workout_carbs_g: number;
  target_rir: number;
  mesocycle_week: number;
  cached: boolean;
}

export const getAmbientBriefing = async (
  params: {
    user_id?: string;
    date_id?: string;
    force_refresh?: boolean;
    steps_today?: number;
    sleep_minutes?: number;
    active_calories_burned?: number;
    resting_heart_rate_bpm?: number;
    user_profile?: Record<string, unknown>;
    daily_log?: Record<string, unknown>;
  } = {}
): Promise<AmbientBriefingData> => {
  const targetId = params.user_id || getActiveUserIdFromAuth();
  const { data } = await apiClient.post<AmbientBriefingData>(
    '/api/v1/cards/ambient-briefing',
    {
      user_id: targetId,
      ...params,
    }
  );
  return data;
};


// ─── Workout Universe Sync API ────────────────────────────────────────────────

export const syncCompletedWorkoutSession = async (
  workout: {
    id: string;
    routineName: string;
    startedAt: string;
    completedAt: string;
    durationSeconds: number;
    totalVolumeLb: number;
    totalSets: number;
    totalReps: number;
    trainedMuscles: string[];
    exercises: any[];
    notes?: string;
  },
  userId?: string
): Promise<void> => {
  const targetId = userId || getActiveUserIdFromAuth();
  await apiClient.post('/api/v1/fitness/sessions', {
    user_id: targetId,
    session_id: workout.id,
    routine_name: workout.routineName,
    started_at: workout.startedAt,
    completed_at: workout.completedAt,
    duration_seconds: workout.durationSeconds,
    total_volume_lb: workout.totalVolumeLb,
    total_sets: workout.totalSets,
    total_reps: workout.totalReps,
    trained_muscles: workout.trainedMuscles,
    exercises: workout.exercises.map(ex => ({
      exercise_id: ex.exerciseId,
      name: ex.name,
      category: ex.category,
      target: ex.target,
      secondary: ex.secondary || [],
      equipment: ex.equipment,
      sets: ex.sets.map((s: any) => ({
        set_number: s.setNumber,
        type: s.type || 'normal',
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        rpe: s.rpe,
        is_completed: s.isCompleted,
      })),
    })),
    notes: workout.notes,
  });
};

export const syncGymCheckIn = async (
  record: {
    id: string;
    gymName: string;
    checkInTime: string;
    checkOutTime?: string;
    durationMinutes?: number;
    date: string;
  },
  userId?: string
): Promise<void> => {
  const targetId = userId || getActiveUserIdFromAuth();
  await apiClient.post('/api/v1/fitness/check-in', {
    user_id: targetId,
    check_in_id: record.id,
    gym_name: record.gymName,
    check_in_time: record.checkInTime,
    check_out_time: record.checkOutTime,
    duration_minutes: record.durationMinutes,
    date: record.date,
  });
};

export const syncWeeklySchedule = async (
  schedule: any[],
  userId?: string
): Promise<void> => {
  const targetId = userId || getActiveUserIdFromAuth();
  await apiClient.put('/api/v1/fitness/schedule', {
    user_id: targetId,
    schedule: schedule.map(day => ({
      day_name: day.dayName,
      is_rest: day.isRest,
      routines: (day.routines || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        exercise_count: r.exerciseCount,
        exercise_ids: r.exerciseIds || [],
        icon_type: r.iconType || 'push',
      })),
    })),
  });
};

export const fetchWeeklySchedule = async (userId?: string): Promise<any[] | null> => {
  const targetId = userId || getActiveUserIdFromAuth();
  const { data } = await apiClient.get('/api/v1/fitness/schedule', {
    params: { user_id: targetId },
  });
  return data.data;
};



