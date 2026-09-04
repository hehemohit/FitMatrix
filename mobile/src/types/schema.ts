export interface BiometricPayload {
  user_id: string;
  message: string;
  steps_today: number;
  sleep_minutes: number;
  logged_workouts?: Array<{
    type: string;
    duration_min: number;
  }>;
}

export interface CoachResponse {
  status: string;
  readiness_score: number;
  fatigue_flag: string | null;
  prescribed_workout: string | null;
  reply: string;
}