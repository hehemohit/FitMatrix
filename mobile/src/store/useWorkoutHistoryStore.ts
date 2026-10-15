import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import { WorkoutSummaryData, ActiveWorkoutExercise } from './useWorkoutSessionStore';

export interface CompletedSetRecord {
  setNumber: number;
  type?: 'normal' | 'warmup' | 'drop' | 'failure' | 'rest_pause';
  weight: number;
  reps: number;
  rir?: number;
  rpe?: number;
  isCompleted: boolean;
}

export interface CompletedExerciseRecord {
  exerciseId: string;
  name: string;
  category?: string;
  target?: string;
  secondary?: string[];
  equipment?: string;
  sets: CompletedSetRecord[];
}

export interface CompletedWorkoutRecord {
  id: string;
  routineName: string;
  startedAt: string; // ISO
  completedAt: string; // ISO
  durationSeconds: number;
  totalVolumeLb: number;
  totalSets: number;
  totalReps: number;
  trainedMuscles: string[];
  exercises: CompletedExerciseRecord[];
  notes?: string;
}

export interface ExercisePRRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxVolume: number;
  estimated1RM: number;
  lastPerformedAt: string;
}

interface WorkoutHistoryState {
  workouts: CompletedWorkoutRecord[];
  saveWorkout: (summary: WorkoutSummaryData, notes?: string) => CompletedWorkoutRecord;
  deleteWorkout: (id: string) => void;
  getHistoryForExercise: (exerciseIdOrName: string) => CompletedSetRecord[] | null;
  getPRForExercise: (exerciseIdOrName: string) => ExercisePRRecord | null;
  getWorkoutsForWeek: (referenceDate?: Date) => CompletedWorkoutRecord[];
  getStreakWeeks: () => number;
}

const storage: MMKV = createMMKV({ id: 'fitmatrix-workout-history' });
const STORAGE_KEY = 'completed_workouts_list';

function loadWorkouts(): CompletedWorkoutRecord[] {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CompletedWorkoutRecord[];
  } catch {
    return [];
  }
}

function persistWorkouts(workouts: CompletedWorkoutRecord[]): void {
  storage.set(STORAGE_KEY, JSON.stringify(workouts));
}

// 1RM calculation: Epley formula: 1RM = Weight * (1 + Reps / 30)
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export const useWorkoutHistoryStore = create<WorkoutHistoryState>((set, get) => ({
  workouts: loadWorkouts(),

  saveWorkout: (summary: WorkoutSummaryData, notes?: string) => {
    const formattedExercises: CompletedExerciseRecord[] = summary.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      category: ex.category,
      target: ex.target,
      secondary: ex.secondary,
      equipment: ex.equipment,
      sets: ex.sets.map(s => ({
        setNumber: s.setNumber,
        type: s.type || 'normal',
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        rpe: s.rpe,
        isCompleted: s.isCompleted,
      })),
    }));

    const newRecord: CompletedWorkoutRecord = {
      id: `wkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      routineName: summary.workoutName || 'Workout Session',
      startedAt: summary.startTime,
      completedAt: summary.endTime || new Date().toISOString(),
      durationSeconds: summary.durationSeconds,
      totalVolumeLb: summary.totalVolumeLb,
      totalSets: summary.totalSets,
      totalReps: summary.totalReps,
      trainedMuscles: summary.trainedMuscles,
      exercises: formattedExercises,
      notes,
    };

    const updated = [newRecord, ...get().workouts];
    persistWorkouts(updated);
    set({ workouts: updated });
    return newRecord;
  },

  deleteWorkout: (id: string) => {
    const updated = get().workouts.filter(w => w.id !== id);
    persistWorkouts(updated);
    set({ workouts: updated });
  },

  getHistoryForExercise: (exerciseIdOrName: string) => {
    const term = exerciseIdOrName.toLowerCase();
    const all = get().workouts;

    for (const w of all) {
      const match = w.exercises.find(
        e => e.exerciseId.toLowerCase() === term || e.name.toLowerCase() === term
      );
      if (match && match.sets && match.sets.length > 0) {
        // Return sets that were completed in that session
        return match.sets.filter(s => s.isCompleted);
      }
    }
    return null;
  },

  getPRForExercise: (exerciseIdOrName: string) => {
    const term = exerciseIdOrName.toLowerCase();
    const all = get().workouts;
    let maxWeight = 0;
    let maxVol = 0;
    let max1RM = 0;
    let lastDate = '';
    let foundName = '';

    for (const w of all) {
      const match = w.exercises.find(
        e => e.exerciseId.toLowerCase() === term || e.name.toLowerCase() === term
      );
      if (match) {
        if (!foundName) foundName = match.name;
        if (!lastDate) lastDate = w.completedAt;

        let sessionVol = 0;
        match.sets.forEach(s => {
          if (s.isCompleted) {
            if (s.weight > maxWeight) maxWeight = s.weight;
            const e1rm = calculate1RM(s.weight, s.reps);
            if (e1rm > max1RM) max1RM = e1rm;
            sessionVol += s.weight * s.reps;
          }
        });
        if (sessionVol > maxVol) maxVol = sessionVol;
      }
    }

    if (maxWeight === 0 && max1RM === 0) return null;

    return {
      exerciseId: exerciseIdOrName,
      exerciseName: foundName || exerciseIdOrName,
      maxWeight,
      maxVolume: maxVol,
      estimated1RM: max1RM,
      lastPerformedAt: lastDate,
    };
  },

  getWorkoutsForWeek: (referenceDate = new Date()) => {
    const all = get().workouts;
    const now = new Date(referenceDate);
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startTs = monday.getTime();
    const endTs = sunday.getTime();

    return all.filter(w => {
      const t = new Date(w.completedAt).getTime();
      return t >= startTs && t <= endTs;
    });
  },

  getStreakWeeks: () => {
    const all = get().workouts;
    if (all.length === 0) return 0;

    // Set of ISO week keys: YYYY-WW
    const weeksSet = new Set<string>();
    all.forEach(w => {
      const d = new Date(w.completedAt);
      const year = d.getFullYear();
      const firstJan = new Date(year, 0, 1);
      const days = Math.floor((d.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((days + firstJan.getDay() + 1) / 7);
      weeksSet.add(`${year}-${weekNum}`);
    });

    return weeksSet.size;
  },
}));
