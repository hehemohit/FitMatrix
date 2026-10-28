/**
 * useUnifiedAthleteStore.ts — FitMatrix Central Unified Athlete Database
 *
 * Architecture:
 * - Single MMKV Instance: 'fitmatrix-central-db'
 * - Day-Partitioned Journal Storage: 'journal:YYYY-MM-DD' (< 3KB compact records, O(1) load)
 * - Single Canonical Athlete Profile with Deterministic Targets (zero duplicate target scalars)
 * - Decoupled In-Memory Session Slice (1-second timers do NOT churn disk or trigger cross-screen re-renders)
 * - Pure Reactive Selectors for All Dynamic Totals (zero drifting counters)
 */

import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import {
  UnifiedAthleteProfile,
  DailyJournalAggregate,
  CanonicalMealEntry,
  CanonicalCompletedWorkout,
  CanonicalWorkoutExercise,
  CanonicalDailyRecovery,
  CanonicalAmbientBriefing,
  UnifiedWeeklySchedule,
  CanonicalMetabolicTargets,
} from '../types/unifiedSchema';
import { deriveMetabolicTargets } from '../utils/metabolism';
import { WorkoutPlan } from '../types/plans';
import { logMealToServer, syncWeeklySchedule, getActiveUserIdFromAuth } from '../api/coachApi';

// ─── Single Central MMKV Storage Instance ─────────────────────────────────────

const centralStorage: MMKV = createMMKV({ id: 'fitmatrix-central-db' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getTodayDateId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getJournalKey = (dateId: string): string => `journal:${dateId}`;

// ─── Default Canonical State ──────────────────────────────────────────────────

const computeInitialTargets = (
  weight = 75,
  height = 175,
  age = 28,
  activity = 'moderate',
  goal = 'hypertrophy'
): CanonicalMetabolicTargets => {
  const derived = deriveMetabolicTargets({
    weight_kg: weight,
    height_cm: height,
    age,
    activity_level: activity,
    fitness_goal: goal,
  });
  return {
    bmr: derived.bmr,
    tdee: derived.tdee,
    targetCalories: derived.target_calories,
    targetProteinG: derived.target_protein_g,
    targetCarbsG: derived.target_carbs_g,
    targetFatsG: derived.target_fats_g,
    computedAt: new Date().toISOString(),
  };
};

const DEFAULT_PROFILE: UnifiedAthleteProfile = {
  userId: 'local_athlete',
  weightKg: 75,
  heightCm: 175,
  age: 28,
  gender: 'male',
  fitnessGoal: 'hypertrophy',
  activityLevel: 'moderate',
  dietaryPreference: 'omnivore',
  allergies: [],
  unit: 'kg',
  mesocycleWeek: 1,
  mesocyclePhase: 'accumulation',
  targetRir: 3,
  targets: computeInitialTargets(),
};

const DEFAULT_RECOVERY: CanonicalDailyRecovery = {
  readinessScore: 82,
  fatigueFlag: 'nominal',
  sleepMinutes: 450,
  restingHeartRateBpm: 60,
  steps: 0,
};

const createEmptyJournal = (dateId: string): DailyJournalAggregate => ({
  dateId,
  meals: [],
  completedWorkouts: [],
  recovery: { ...DEFAULT_RECOVERY },
});

const DEFAULT_SCHEDULE: UnifiedWeeklySchedule = {
  days: [
    {
      dayName: 'Monday',
      isRest: false,
      routines: [{ id: 'r_mon', name: 'Push Hypertrophy', exerciseCount: 5, iconType: 'push' }],
    },
    { dayName: 'Tuesday', isRest: true, routines: [] },
    {
      dayName: 'Wednesday',
      isRest: false,
      routines: [{ id: 'r_wed', name: 'Pull Hypertrophy', exerciseCount: 5, iconType: 'pull' }],
    },
    { dayName: 'Thursday', isRest: true, routines: [] },
    {
      dayName: 'Friday',
      isRest: false,
      routines: [{ id: 'r_fri', name: 'Leg Day Hypertrophy', exerciseCount: 5, iconType: 'legs' }],
    },
    { dayName: 'Saturday', isRest: true, routines: [] },
    { dayName: 'Sunday', isRest: true, routines: [] },
  ],
};

// ─── Initial Hydration from MMKV ──────────────────────────────────────────────

const loadProfileFromStorage = (): UnifiedAthleteProfile => {
  try {
    const raw = centralStorage.getString('athlete_profile');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[UnifiedStore] Profile hydration fallback', e);
  }
  return DEFAULT_PROFILE;
};

const loadJournalFromStorage = (dateId: string): DailyJournalAggregate => {
  try {
    const raw = centralStorage.getString(getJournalKey(dateId));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`[UnifiedStore] Journal hydration fallback for ${dateId}`, e);
  }
  return createEmptyJournal(dateId);
};

const loadScheduleFromStorage = (): UnifiedWeeklySchedule => {
  try {
    const raw = centralStorage.getString('training_schedule');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[UnifiedStore] Schedule hydration fallback', e);
  }
  return DEFAULT_SCHEDULE;
};

// ─── Store Interface ──────────────────────────────────────────────────────────

export interface UnifiedAthleteState {
  // ── 1. Canonical State ──
  athleteProfile: UnifiedAthleteProfile;
  todayJournal: DailyJournalAggregate;
  trainingSchedule: UnifiedWeeklySchedule;

  // ── 2. Decoupled In-Memory Active Session Slice (0ms timers, zero disk churn) ──
  isWorkoutActive: boolean;
  activeWorkoutName: string;
  activeElapsedSeconds: number;
  isPaused: boolean;
  isMinimized: boolean;
  activeExercises: CanonicalWorkoutExercise[];

  // ── 3. Profile & Targets Actions ──
  updateProfile: (patch: Partial<UnifiedAthleteProfile>) => void;
  weighIn: (weightKg: number) => void;

  // ── 4. Nutrition Domain Actions ──
  logMeal: (meal: CanonicalMealEntry) => Promise<void>;
  deleteMeal: (mealId: string) => void;
  updateMeal: (meal: CanonicalMealEntry) => void;
  setTodayMeals: (meals: CanonicalMealEntry[]) => void;

  // ── 5. Workout Domain Actions ──
  finalizeWorkoutSession: (workout: CanonicalCompletedWorkout) => void;
  setWeeklySchedule: (schedule: UnifiedWeeklySchedule) => void;
  syncWithAiPlan: (plan: WorkoutPlan) => void;

  // ── 6. Active Session Actions (Ephemeral in-memory) ──
  startActiveWorkout: (name: string, initialExercises?: CanonicalWorkoutExercise[]) => void;
  tickActiveWorkoutTimer: () => void;
  pauseActiveWorkout: () => void;
  resumeActiveWorkout: () => void;
  minimizeActiveWorkout: (minimized: boolean) => void;
  discardActiveWorkout: () => void;
  finishActiveWorkout: () => CanonicalCompletedWorkout;

  // ── 7. Recovery & Ambient Briefing ──
  setDailyRecovery: (recovery: Partial<CanonicalDailyRecovery>) => void;
  setDailyBriefing: (briefing: CanonicalAmbientBriefing) => void;
  checkAndRollCalendarDay: () => void;
}

// ─── Store Creation ───────────────────────────────────────────────────────────

export const useUnifiedAthleteStore = create<UnifiedAthleteState>((set, get) => {
  const initialProfile = loadProfileFromStorage();
  const todayDateId = getTodayDateId();
  const initialJournal = loadJournalFromStorage(todayDateId);
  const initialSchedule = loadScheduleFromStorage();

  return {
    // ── Initial State ──
    athleteProfile: initialProfile,
    todayJournal: initialJournal,
    trainingSchedule: initialSchedule,

    // In-memory active session (never churns MMKV on 1-sec ticks)
    isWorkoutActive: false,
    activeWorkoutName: 'Quick Workout',
    activeElapsedSeconds: 0,
    isPaused: false,
    isMinimized: false,
    activeExercises: [],

    // ── Profile & Targets Actions ──
    updateProfile: patch => {
      const current = get().athleteProfile;
      const updated: UnifiedAthleteProfile = {
        ...current,
        ...patch,
      };

      // Recalculate deterministic targets if anthropometrics change
      const derived = deriveMetabolicTargets({
        weight_kg: updated.weightKg,
        height_cm: updated.heightCm,
        age: updated.age,
        activity_level: updated.activityLevel,
        fitness_goal: updated.fitnessGoal,
      });

      updated.targets = {
        bmr: patch.targets?.bmr || derived.bmr,
        tdee: patch.targets?.tdee || derived.tdee,
        targetCalories: patch.targets?.targetCalories || derived.target_calories,
        targetProteinG: patch.targets?.targetProteinG || derived.target_protein_g,
        targetCarbsG: patch.targets?.targetCarbsG || derived.target_carbs_g,
        targetFatsG: patch.targets?.targetFatsG || derived.target_fats_g,
        computedAt: new Date().toISOString(),
      };

      centralStorage.set('athlete_profile', JSON.stringify(updated));
      set({ athleteProfile: updated });
    },

    weighIn: weightKg => {
      const currentProfile = get().athleteProfile;
      const currentJournal = get().todayJournal;

      // 1. Update scale weight in today's day-bounded journal
      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        scaleWeightKg: weightKg,
      };
      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));

      // 2. Synchronize current weight in profile and recompute targets
      get().updateProfile({ weightKg });
      set({ todayJournal: updatedJournal });
    },

    // ── Nutrition Domain Actions ──
    logMeal: async meal => {
      const currentJournal = get().todayJournal;
      const updatedMeals = [...currentJournal.meals, meal];

      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        meals: updatedMeals,
      };

      // Persist day-bounded compact record (< 3KB)
      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));
      set({ todayJournal: updatedJournal });

      // Background cloud sync
      try {
        const uid = getActiveUserIdFromAuth();
        await logMealToServer(uid, {
          meal_id: meal.mealId,
          name: meal.name,
          category: meal.category,
          time: meal.time,
          calories: meal.calories,
          protein_g: meal.proteinG,
          carbs_g: meal.carbsG,
          fats_g: meal.fatsG,
        });
      } catch (err) {
        console.warn('[UnifiedStore] Meal background cloud sync note:', err);
      }
    },

    deleteMeal: mealId => {
      const currentJournal = get().todayJournal;
      const updatedMeals = currentJournal.meals.filter(m => m.mealId !== mealId);

      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        meals: updatedMeals,
      };

      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));
      set({ todayJournal: updatedJournal });
    },



    updateMeal: meal => {
      const currentJournal = get().todayJournal;
      const updatedMeals = currentJournal.meals.map(m => (m.mealId === meal.mealId ? meal : m));

      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        meals: updatedMeals,
      };

      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));
      set({ todayJournal: updatedJournal });
    },



    setTodayMeals: meals => {
      const currentJournal = get().todayJournal;
      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        meals,
      };

      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));
      set({ todayJournal: updatedJournal });
    },



    // ── Workout Domain Actions ──
    finalizeWorkoutSession: workout => {
      const currentJournal = get().todayJournal;
      const updatedWorkouts = [...currentJournal.completedWorkouts, workout];

      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        completedWorkouts: updatedWorkouts,
      };

      // Commit to day-partitioned storage atomically
      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));
      set({ todayJournal: updatedJournal });
    },



    setWeeklySchedule: schedule => {
      centralStorage.set('training_schedule', JSON.stringify(schedule));
      set({ trainingSchedule: schedule });
      syncWeeklySchedule(schedule.days as any).catch(err => {
        console.warn('[UnifiedStore] Weekly schedule sync note:', err);
      });
    },

    syncWithAiPlan: plan => {
      if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) return;

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const updatedDays = daysOfWeek.map((dayName, idx) => {
        const matched = plan.days.find(
          d => (d.day || '').toLowerCase().includes(dayName.toLowerCase()) || (d.day || '').toLowerCase() === `day ${idx + 1}`
        ) || (idx < plan.days.length ? plan.days[idx] : null);

        if (matched && matched.exercises && matched.exercises.length > 0) {
          const muscles = matched.targetMuscleGroups && matched.targetMuscleGroups.length > 0
            ? matched.targetMuscleGroups.join(' & ')
            : 'Target Routine';
          const nameLower = muscles.toLowerCase();
          let iconType: 'push' | 'pull' | 'legs' = 'push';
          if (nameLower.includes('pull') || nameLower.includes('back')) iconType = 'pull';
          else if (nameLower.includes('leg') || nameLower.includes('squat')) iconType = 'legs';

          return {
            dayName,
            isRest: false,
            routines: [
              {
                id: `r_ai_${idx}_${Date.now()}`,
                name: muscles,
                exerciseCount: matched.exercises.length,
                iconType,
              },
            ],
          };
        } else {
          return {
            dayName,
            isRest: true,
            routines: [],
          };
        }
      });

      const updatedSchedule: UnifiedWeeklySchedule = { days: updatedDays };
      get().setWeeklySchedule(updatedSchedule);
    },

    // ── Active Session Actions (Ephemeral in-memory) ──
    startActiveWorkout: (name, initialExercises = []) => {
      set({
        isWorkoutActive: true,
        activeWorkoutName: name,
        activeElapsedSeconds: 0,
        isPaused: false,
        isMinimized: false,
        activeExercises: initialExercises,
      });
    },

    tickActiveWorkoutTimer: () => {
      const { isWorkoutActive, isPaused, activeElapsedSeconds } = get();
      if (!isWorkoutActive || isPaused) return;
      // In-memory tick only — zero disk I/O
      set({ activeElapsedSeconds: activeElapsedSeconds + 1 });
    },

    pauseActiveWorkout: () => set({ isPaused: true }),
    resumeActiveWorkout: () => set({ isPaused: false }),
    minimizeActiveWorkout: minimized => set({ isMinimized: minimized }),

    discardActiveWorkout: () => {
      set({
        isWorkoutActive: false,
        activeElapsedSeconds: 0,
        isPaused: false,
        isMinimized: false,
        activeExercises: [],
      });
    },

    finishActiveWorkout: () => {
      const state = get();
      let totalVol = 0;
      let totalSets = 0;
      let totalReps = 0;
      const trained = new Set<string>();

      state.activeExercises.forEach(ex => {
        if (ex.targetMuscle) trained.add(ex.targetMuscle);
        ex.sets.forEach(s => {
          if (s.isCompleted) {
            totalSets += 1;
            totalReps += s.reps;
            totalVol += s.weight * s.reps;
          }
        });
      });

      const estCalories = Math.max(120, Math.round((state.activeElapsedSeconds / 60) * 7.5));

      const completedWorkout: CanonicalCompletedWorkout = {
        id: `w_comp_${Date.now()}`,
        routineName: state.activeWorkoutName,
        startedAt: new Date(Date.now() - state.activeElapsedSeconds * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: state.activeElapsedSeconds,
        caloriesBurned: estCalories,
        totalVolumeLb: totalVol,
        totalSets,
        totalReps,
        trainedMuscles: Array.from(trained),
        exercises: state.activeExercises,
      };

      // Commit to daily journal (instantly expands dynamic TDEE)
      get().finalizeWorkoutSession(completedWorkout);

      // Reset active in-memory session
      get().discardActiveWorkout();

      return completedWorkout;
    },

    // ── Recovery & Ambient Briefing ──
    setDailyRecovery: recovery => {
      const currentJournal = get().todayJournal;
      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        recovery: {
          ...currentJournal.recovery,
          ...recovery,
        },
      };

      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));
      set({ todayJournal: updatedJournal });
    },



    setDailyBriefing: briefing => {
      const currentJournal = get().todayJournal;
      const updatedJournal: DailyJournalAggregate = {
        ...currentJournal,
        dailyBriefing: briefing,
      };

      centralStorage.set(getJournalKey(currentJournal.dateId), JSON.stringify(updatedJournal));
      set({ todayJournal: updatedJournal });
    },

    checkAndRollCalendarDay: () => {
      const today = getTodayDateId();
      if (get().todayJournal.dateId !== today) {
        const newJournal = loadJournalFromStorage(today);
        set({ todayJournal: newJournal });
      }
    },
  };
});
