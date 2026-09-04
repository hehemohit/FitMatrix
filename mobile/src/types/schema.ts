export interface ChatHistoryItem {
  role: 'user' | 'coach';
  text: string;
}

export interface BiometricPayload {
  user_id: string;
  message: string;
  steps_today: number;
  sleep_minutes: number;
  logged_workouts?: Array<{
    type: string;
    duration_min: number;
  }>;
  history?: ChatHistoryItem[];
  readiness_score?: number;
  prescribed_workout?: string | null;
}

export interface CoachResponse {
  status: string;
  readiness_score: number;
  fatigue_flag: string | null;
  prescribed_workout: string | null;
  reply: string;
}