/**
 * FitMatrix Structured Plan Types
 * Agent-generated artifacts that hydrate native Plan Studio components.
 */

// ─── Workout Plan ──────────────────────────────────────────────────────────

export interface Exercise {
  name: string;
  sets: number;
  reps: number | string; // e.g. 8 or "8-12" or "AMRAP"
  rpe?: number;           // Rate of Perceived Exertion 1-10
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutDay {
  day: string;              // e.g. "Monday" or "Day 1"
  targetMuscleGroups: string[];
  exercises: Exercise[];
}

export interface WorkoutPlan {
  planId: string;
  generatedAt: string;      // ISO 8601
  durationWeeks: number;
  fitnessGoal: string;      // e.g. "hypertrophy", "strength", "fat_loss"
  days: WorkoutDay[];
}

// ─── Diet Plan ────────────────────────────────────────────────────────────

export interface MealWindow {
  time: string;             // e.g. "08:00", "Pre-workout"
  description: string;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  calories: number;
}

export interface DietPlan {
  planId: string;
  generatedAt: string;
  dailyCalories: number;
  macroSplit: {
    proteinG: number;
    carbsG: number;
    fatsG: number;
  };
  dietaryPreference: string;  // e.g. "pure_vegetarian", "omnivore"
  meals: MealWindow[];
  hydrationLiters: number;
}

// ─── Sleep Goal ────────────────────────────────────────────────────────────

export interface SleepGoal {
  planId: string;
  generatedAt: string;
  targetBedtime: string;         // e.g. "22:30"
  targetWakeTime: string;        // e.g. "06:30"
  targetDurationHours: number;
  windDownMilestones: string[];  // e.g. ["No screens by 21:30", "Dim lights at 22:00"]
  recoveryScoreThreshold: number; // minimum score to attempt full volume
}

// ─── Union ────────────────────────────────────────────────────────────────

export type AnyPlan = WorkoutPlan | DietPlan | SleepGoal;

export function isWorkoutPlan(p: AnyPlan): p is WorkoutPlan {
  return 'days' in p;
}
export function isDietPlan(p: AnyPlan): p is DietPlan {
  return 'meals' in p;
}
export function isSleepGoal(p: AnyPlan): p is SleepGoal {
  return 'targetBedtime' in p;
}
