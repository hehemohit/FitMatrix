export interface ChatHistoryItem {
  role: 'user' | 'coach';
  text: string;
}

export interface UserProfile {
  dietary_preference?: string;
  allergies?: string[];
  fitness_goal?: string;
  target_calories?: number;
  target_protein_g?: number;
  // Biometrics (stored locally via MMKV, sent to agents as context)
  weight_kg?: number;
  height_cm?: number;
  age?: number;
  activity_level?: string;
}

export interface DailyLog {
  meals_logged?: string[];
  workouts_completed?: string[];
  calories_logged?: number;
  protein_logged_g?: number;
}

export interface BiometricPayload {
  user_id: string;
  message: string;
  steps_today: number;
  sleep_minutes: number;
  active_calories_burned?: number;
  resting_heart_rate_bpm?: number;
  logged_workouts?: Array<{
    type: string;
    duration_min: number;
  }>;
  history?: ChatHistoryItem[];
  readiness_score?: number;
  prescribed_workout?: string | null;
  user_profile?: UserProfile;
  daily_log?: DailyLog;
}

export interface CoachResponse {
  status: string;
  readiness_score: number;
  fatigue_flag: string | null;
  prescribed_workout: string | null;
  reply: string;
  user_profile?: UserProfile;
  daily_log?: DailyLog;
  current_topic?: string | null;
}