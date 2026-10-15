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
  unit?: 'kg' | 'lb';
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
  context_domain?: string;
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

// ─── MacroFactor Strategy Command Center Types ──────────────────────────────

export type GoalType = 'fat_loss' | 'maintenance' | 'muscle_gain';
export type CoachingMode = 'coached' | 'collaborative' | 'manual';
export type DietStyle = 'balanced' | 'low_carb' | 'keto' | 'high_protein';
export type ProteinPreference = 'low' | 'moderate' | 'high';

export interface DayMacroTarget {
  day: string;
  is_training_day: boolean;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface StrategyProfile {
  user_id: string;
  goal_type: GoalType;
  target_weight_kg: number;
  starting_weight_kg: number;
  current_weight_kg: number;
  weekly_rate_percent: number;
  weekly_weight_delta_kg: number;
  estimated_completion_date: string | null;
  weeks_to_goal: number | null;
  coaching_mode: CoachingMode;
  check_in_day: string;
  last_check_in_date: string | null;
  diet_style: DietStyle;
  protein_preference: ProteinPreference;
  use_day_variation: boolean;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fats_g: number;
  schedule_targets: DayMacroTarget[];
  current_expenditure_tdee: number;
  expenditure_trend_delta: number;
  expenditure_history_14d: number[];
  updated_at?: string;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  narrative_coaching: string;
  old_expenditure: number;
  new_expenditure: number;
  old_targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  new_targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  deltas: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  updated_profile: StrategyProfile;
}