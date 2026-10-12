import { apiClient } from './coachApi';
import { StrategyProfile } from '../types/schema';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  full_name: string;
  email: string;
  is_onboarded: boolean;
}

export interface OnboardingPayload {
  user_id?: string;
  full_name: string;
  age: number;
  sex: string;
  height_cm: number;
  current_weight_kg: number;
  goal_type: 'fat_loss' | 'maintenance' | 'muscle_gain';
  target_weight_kg: number;
  weekly_rate_percent: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  diet_style: 'balanced' | 'low_carb' | 'keto' | 'high_protein';
  protein_preference: 'low' | 'moderate' | 'high';
  training_days: string[];
}

export interface OnboardingResponse {
  success: boolean;
  message: string;
  calibration: {
    bmr: number;
    tdee: number;
    target_calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    weekly_delta_kg: number;
    weeks_to_goal: number;
    estimated_completion_date: string;
  };
  strategy_profile: StrategyProfile;
}

export const registerApi = async (
  email: string,
  password: string,
  fullName: string
): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/register', {
    email,
    password,
    full_name: fullName,
  });
  return data;
};

export const loginApi = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/login', {
    email,
    password,
  });
  return data;
};

export const getMeApi = async (): Promise<any> => {
  const { data } = await apiClient.get('/api/v1/auth/me');
  return data;
};

export const submitOnboardingApi = async (
  payload: OnboardingPayload
): Promise<OnboardingResponse> => {
  const { data } = await apiClient.post<OnboardingResponse>(
    '/api/v1/auth/onboarding',
    payload
  );
  return data;
};
