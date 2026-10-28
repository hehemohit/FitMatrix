/**
 * unifiedSchema.ts — FitMatrix Canonical Domain Types
 *
 * Single Source of Truth for:
 * 1. UnifiedAthleteProfile (biometrics, goals, mesocycle, deterministic targets)
 * 2. DailyJournalAggregate (day-partitioned meals, completed workouts, recovery)
 * 3. CanonicalWorkoutExercise & CanonicalCompletedWorkout
 * 4. UnifiedWeeklySchedule & UnifiedRoutine
 *
 * Eliminates all redundant target scalars and conflicting interfaces across the platform.
 */

// ─── 1. Canonical Metabolic Targets (Single Source) ──────────────────────────

export interface CanonicalMetabolicTargets {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatsG: number;
  computedAt?: string;
}

// ─── 2. Canonical Athlete Profile ───────────────────────────────────────────

export interface UnifiedAthleteProfile {
  userId: string;
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'male' | 'female';
  fitnessGoal: 'hypertrophy' | 'fat_loss' | 'strength' | 'endurance';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietaryPreference: 'omnivore' | 'vegetarian' | 'pure_vegetarian' | 'vegan' | 'keto' | 'jain';
  allergies: string[];
  unit: 'kg' | 'lb';

  // RP Hypertrophy Periodization State
  mesocycleWeek: number;
  mesocyclePhase: 'accumulation' | 'intensification' | 'overreaching' | 'deload';
  targetRir: number;

  // Single Canonical Targets (replaces all duplicate calorie/protein fields)
  targets: CanonicalMetabolicTargets;
}

// ─── 3. Canonical Nutrition & Meal Entries ──────────────────────────────────

export interface CanonicalMealEntry {
  mealId: string;
  name: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Pre-Workout' | 'Post-Workout';
  time: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  loggedAt: string; // ISO 8601
}

// ─── 4. Canonical Workout Sets, Exercises & Sessions ────────────────────────

export type CanonicalSetType = 'normal' | 'warmup' | 'drop' | 'failure' | 'rest_pause';

export interface CanonicalSet {
  setNumber: number;
  type: CanonicalSetType;
  weight: number;
  reps: number;
  rir?: number;
  rpe?: number;
  isCompleted: boolean;
}

export interface CanonicalWorkoutExercise {
  exerciseId: string;
  name: string;
  targetMuscle: string;
  category: string;
  sets: CanonicalSet[];
  notes?: string;
}

export interface CanonicalCompletedWorkout {
  id: string;
  routineName: string;
  startedAt: string;  // ISO 8601
  completedAt: string; // ISO 8601
  durationSeconds: number;
  caloriesBurned: number;
  totalVolumeLb: number;
  totalSets: number;
  totalReps: number;
  trainedMuscles: string[];
  exercises: CanonicalWorkoutExercise[];
  notes?: string;
}

// ─── 5. Canonical Daily Journal (Day-Bounded Partition: journal:YYYY-MM-DD) ─

export interface CanonicalDailyRecovery {
  readinessScore: number;
  fatigueFlag: 'nominal' | 'high_fatigue';
  sleepMinutes: number;
  restingHeartRateBpm: number;
  steps: number;
}

export interface CanonicalAmbientBriefing {
  headline: string;
  briefingText: string;
  targetRir: number;
  mesocycleWeek: number;
  periWorkoutCarbsG: number;
  prescribedWorkout?: string;
  synthesizedAt?: string;
}

export interface DailyJournalAggregate {
  dateId: string; // YYYY-MM-DD
  scaleWeightKg?: number;
  meals: CanonicalMealEntry[];
  completedWorkouts: CanonicalCompletedWorkout[];
  recovery: CanonicalDailyRecovery;
  dailyBriefing?: CanonicalAmbientBriefing;
}

// ─── 6. Canonical Unified Training Schedule ─────────────────────────────────

export interface UnifiedRoutine {
  id: string;
  name: string;
  exerciseCount: number;
  exerciseIds?: string[];
  iconType: 'push' | 'pull' | 'legs';
}

export interface UnifiedScheduleDay {
  dayName: string; // 'Monday' | 'Tuesday' | ...
  isRest: boolean;
  routines: UnifiedRoutine[];
}

export interface UnifiedWeeklySchedule {
  days: UnifiedScheduleDay[];
}

