import axios from 'axios';
import { BiometricPayload, CoachResponse } from '../types/schema';
import { WorkoutPlan, DietPlan, SleepGoal } from '../types/plans';

// Set your deployed Render URL here once created:
// e.g. 'https://fitmatrix-backend.onrender.com'
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
      const fallbackBase = currentBase.includes('10.0.2.2')
        ? 'http://localhost:8000'
        : 'http://10.0.2.2:8000';

      console.warn(`[apiClient] Network error on ${currentBase}. Retrying with ${fallbackBase}...`);
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