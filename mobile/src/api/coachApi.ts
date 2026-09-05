import axios from 'axios';
import { BiometricPayload, CoachResponse } from '../types/schema';
import { WorkoutPlan, DietPlan, SleepGoal } from '../types/plans';

// 'http://10.0.2.2:8000' for Android Emulator
// 'http://localhost:8000' for physical USB device with adb reverse
export const BASE_URL = 'http://10.0.2.2:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Multi-agent chains (sleep → workout → diet) can take 30-60s on free-tier LLMs.
  timeout: 90000,
});

// ─── Conversational Chat ──────────────────────────────────────────────────────

export const sendBiometricsAndMessage = async (
  payload: BiometricPayload
): Promise<CoachResponse> => {
  const response = await apiClient.post<CoachResponse>('/api/v1/chat', payload);
  return response.data;
};

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
  const response = await apiClient.post<WorkoutPlan>('/api/v1/plan/workout', payload);
  return response.data;
};

export const generateDietPlan = async (payload: PlanRequest): Promise<DietPlan> => {
  const response = await apiClient.post<DietPlan>('/api/v1/plan/diet', payload);
  return response.data;
};

export const generateSleepGoal = async (payload: PlanRequest): Promise<SleepGoal> => {
  const response = await apiClient.post<SleepGoal>('/api/v1/plan/sleep', payload);
  return response.data;
};