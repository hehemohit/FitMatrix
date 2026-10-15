import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import { ExerciseRecord } from '../utils/muscleTargetMapper';
import { useWorkoutHistoryStore } from './useWorkoutHistoryStore';

const storage: MMKV = createMMKV({ id: 'fitmatrix-active-workout' });

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure' | 'rest_pause';

export interface LoggedSet {
  setNumber: number;
  type?: SetType;
  previousPerformance?: string;
  previousWeight?: number;
  previousReps?: number;
  targetReps?: string;
  targetRir?: number;
  rir?: number;
  rpe?: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ActiveWorkoutExercise {
  instanceId: string;
  exerciseId: string;
  name: string;
  category: string;
  target: string;
  secondary: string[];
  equipment: string;
  image: string;
  gifUrl: string;
  sets: LoggedSet[];
  notes?: string;
}

export interface WorkoutSummaryData {
  workoutName: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  totalVolumeLb: number;
  totalSets: number;
  totalReps: number;
  exercises: ActiveWorkoutExercise[];
  trainedMuscles: string[];
}

interface PersistedWorkoutState {
  isActive: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  workoutName: string;
  startTime: number | null;
  restTimerEndsAt: number | null;
  restTimerInitial: number;
  exercises: ActiveWorkoutExercise[];
  activeExerciseIndex: number;
  activeSetIndex: number;
}

const loadPersistedSession = (): PersistedWorkoutState | null => {
  try {
    const raw = storage.getString('active_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isActive && parsed.startTime) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[useWorkoutSessionStore] Failed to load active session from MMKV', e);
  }
  return null;
};

const savePersistedSession = (data: PersistedWorkoutState | null) => {
  try {
    if (data && data.isActive) {
      storage.set('active_session', JSON.stringify(data));
    } else {
      storage.remove('active_session');
    }
  } catch (e) {
    console.warn('[useWorkoutSessionStore] Failed to persist active session to MMKV', e);
  }
};

interface WorkoutSessionState {
  isActive: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  workoutName: string;
  startTime: number | null;
  elapsedSeconds: number;

  // Rest Timer
  restTimerSeconds: number;
  restTimerInitial: number;
  restTimerActive: boolean;
  restTimerEndsAt: number | null;
  isRestSheetOpen: boolean;

  // Active Exercises
  exercises: ActiveWorkoutExercise[];
  activeExerciseIndex: number;
  activeSetIndex: number;
  activeFieldType: 'weight' | 'reps';
  activeInputString: string;

  // Actions
  startWorkout: (
    name?: string,
    initialExercises?: (ExerciseRecord & { targetSets?: number; targetReps?: string | number })[]
  ) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  minimizeWorkout: (isMinimized: boolean) => void;
  discardWorkout: () => void;
  finishWorkout: () => WorkoutSummaryData;
  renameWorkout: (name: string) => void;
  markAllSetsDone: () => void;

  // Timers
  tickWorkoutTimer: () => void;
  startRestTimer: (duration?: number) => void;
  adjustRestTimer: (delta: number) => void;
  stopRestTimer: () => void;
  setRestSheetOpen: (open: boolean) => void;

  // Exercises
  setActiveExerciseIndex: (idx: number) => void;
  addExerciseToWorkout: (exercise: ExerciseRecord) => void;
  swapExerciseInWorkout: (idx: number, exercise: ExerciseRecord) => void;
  removeExerciseFromWorkout: (idx: number) => void;
  reorderExercise: (fromIdx: number, toIdx: number) => void;
  updateExerciseNotes: (exerciseIndex: number, notes: string) => void;

  // Sets
  addSet: (exerciseIndex: number, isWarmup?: boolean) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  setSetType: (exerciseIndex: number, setIndex: number, type: SetType) => void;
  setSetRir: (exerciseIndex: number, setIndex: number, rir: number) => void;
  updateSetWeight: (exerciseIndex: number, setIndex: number, weight: number) => void;
  updateSetReps: (exerciseIndex: number, setIndex: number, reps: number) => void;
  focusField: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps') => void;

  // Keypad
  handleKeypadPress: (val: string) => void;
  handleKeypadBackspace: () => void;
  handleKeypadIncrement: (delta: number) => void;
  handleKeypadNext: () => void;
}

const initialHydration = loadPersistedSession();
const initialElapsed = initialHydration?.startTime
  ? Math.floor((Date.now() - initialHydration.startTime) / 1000)
  : 0;

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  isActive: initialHydration?.isActive ?? false,
  isPaused: initialHydration?.isPaused ?? false,
  isMinimized: initialHydration?.isMinimized ?? false,
  workoutName: initialHydration?.workoutName ?? 'Live Workout',
  startTime: initialHydration?.startTime ?? null,
  elapsedSeconds: initialElapsed,

  restTimerSeconds: 0,
  restTimerInitial: initialHydration?.restTimerInitial ?? 90,
  restTimerActive: false,
  restTimerEndsAt: initialHydration?.restTimerEndsAt ?? null,
  isRestSheetOpen: false,

  exercises: initialHydration?.exercises ?? [],
  activeExerciseIndex: initialHydration?.activeExerciseIndex ?? 0,
  activeSetIndex: initialHydration?.activeSetIndex ?? 0,
  activeFieldType: 'weight',
  activeInputString: '',

  startWorkout: (name = 'Workout Session', initialExercises = []) => {
    const historyStore = useWorkoutHistoryStore.getState();

    const formattedExercises: ActiveWorkoutExercise[] = initialExercises.map((e, idx) => {
      const setCount = e.targetSets && e.targetSets > 0 ? e.targetSets : 3;
      const targetRepsStr = e.targetReps ? `${e.targetReps} reps` : '8-10 reps';
      const defaultReps = typeof e.targetReps === 'number' ? e.targetReps : 8;

      // Query past performance for ghost sets
      const pastSets = historyStore.getHistoryForExercise(e.id || e.name);
      const latestPastSet = pastSets && pastSets[0] ? pastSets[0] : null;
      const initialWeight = latestPastSet ? latestPastSet.weight : 135;

      const sets: LoggedSet[] = Array.from({ length: setCount }, (_, sIdx) => {
        const pastSetForIdx = pastSets && pastSets[sIdx] ? pastSets[sIdx] : latestPastSet;
        const prevPerf = pastSetForIdx ? `${pastSetForIdx.weight} lb × ${pastSetForIdx.reps}` : undefined;

        return {
          setNumber: sIdx + 1,
          type: 'normal',
          previousPerformance: prevPerf,
          previousWeight: pastSetForIdx ? pastSetForIdx.weight : undefined,
          previousReps: pastSetForIdx ? pastSetForIdx.reps : undefined,
          targetReps: targetRepsStr,
          weight: initialWeight,
          reps: defaultReps,
          isCompleted: false,
        };
      });

      return {
        instanceId: `ex_inst_${Date.now()}_${idx}`,
        exerciseId: e.id || `custom_${idx}`,
        name: e.name,
        category: e.category || 'Strength',
        target: e.target || 'Full Body',
        secondary: e.secondary || [],
        equipment: e.equipment || 'Barbell',
        image: e.image || '',
        gifUrl: e.gifUrl || '',
        sets,
      };
    });

    const now = Date.now();
    const newState = {
      isActive: true,
      isPaused: false,
      isMinimized: false,
      workoutName: name,
      startTime: now,
      elapsedSeconds: 0,
      exercises: formattedExercises,
      activeExerciseIndex: 0,
      activeSetIndex: 0,
      activeFieldType: 'weight' as const,
      activeInputString: formattedExercises[0]?.sets[0] ? String(formattedExercises[0].sets[0].weight) : '',
      restTimerActive: false,
      restTimerSeconds: 0,
      restTimerEndsAt: null,
    };

    savePersistedSession({
      isActive: true,
      isPaused: false,
      isMinimized: false,
      workoutName: name,
      startTime: now,
      restTimerEndsAt: null,
      restTimerInitial: 90,
      exercises: formattedExercises,
      activeExerciseIndex: 0,
      activeSetIndex: 0,
    });

    set(newState);
  },

  pauseWorkout: () => {
    set({ isPaused: true });
    const cur = get();
    savePersistedSession({
      isActive: cur.isActive,
      isPaused: true,
      isMinimized: cur.isMinimized,
      workoutName: cur.workoutName,
      startTime: cur.startTime,
      restTimerEndsAt: cur.restTimerEndsAt,
      restTimerInitial: cur.restTimerInitial,
      exercises: cur.exercises,
      activeExerciseIndex: cur.activeExerciseIndex,
      activeSetIndex: cur.activeSetIndex,
    });
  },

  resumeWorkout: () => {
    set({ isPaused: false });
    const cur = get();
    savePersistedSession({
      isActive: cur.isActive,
      isPaused: false,
      isMinimized: cur.isMinimized,
      workoutName: cur.workoutName,
      startTime: cur.startTime,
      restTimerEndsAt: cur.restTimerEndsAt,
      restTimerInitial: cur.restTimerInitial,
      exercises: cur.exercises,
      activeExerciseIndex: cur.activeExerciseIndex,
      activeSetIndex: cur.activeSetIndex,
    });
  },

  minimizeWorkout: (isMinimized: boolean) => {
    set({ isMinimized });
    const cur = get();
    savePersistedSession({
      isActive: cur.isActive,
      isPaused: cur.isPaused,
      isMinimized,
      workoutName: cur.workoutName,
      startTime: cur.startTime,
      restTimerEndsAt: cur.restTimerEndsAt,
      restTimerInitial: cur.restTimerInitial,
      exercises: cur.exercises,
      activeExerciseIndex: cur.activeExerciseIndex,
      activeSetIndex: cur.activeSetIndex,
    });
  },

  discardWorkout: () => {
    savePersistedSession(null);
    set({
      isActive: false,
      isPaused: false,
      isMinimized: false,
      startTime: null,
      elapsedSeconds: 0,
      restTimerActive: false,
      restTimerSeconds: 0,
      restTimerEndsAt: null,
      exercises: [],
    });
  },

  finishWorkout: () => {
    const state = get();
    let totalVol = 0;
    let totalSets = 0;
    let totalReps = 0;
    const trained = new Set<string>();

    state.exercises.forEach(ex => {
      if (ex.target) trained.add(ex.target);
      ex.sets.forEach(s => {
        if (s.isCompleted) {
          totalSets += 1;
          totalReps += s.reps;
          totalVol += s.weight * s.reps;
        }
      });
    });

    const summary: WorkoutSummaryData = {
      workoutName: state.workoutName,
      startTime: new Date(state.startTime || Date.now()).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: state.elapsedSeconds,
      totalVolumeLb: totalVol,
      totalSets,
      totalReps,
      exercises: state.exercises,
      trainedMuscles: Array.from(trained),
    };

    savePersistedSession(null);

    set({
      isActive: false,
      isPaused: false,
      isMinimized: false,
      restTimerActive: false,
      restTimerSeconds: 0,
      restTimerEndsAt: null,
    });

    try {
      useWorkoutHistoryStore.getState().saveWorkout(summary);
    } catch (e) {
      console.warn('Failed to save workout to history:', e);
    }

    return summary;
  },

  renameWorkout: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set({ workoutName: trimmed });
    const cur = get();
    savePersistedSession({
      isActive: cur.isActive,
      isPaused: cur.isPaused,
      isMinimized: cur.isMinimized,
      workoutName: trimmed,
      startTime: cur.startTime,
      restTimerEndsAt: cur.restTimerEndsAt,
      restTimerInitial: cur.restTimerInitial,
      exercises: cur.exercises,
      activeExerciseIndex: cur.activeExerciseIndex,
      activeSetIndex: cur.activeSetIndex,
    });
  },

  markAllSetsDone: () => {
    set(state => {
      const updated = state.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s, isCompleted: true, completedAt: s.completedAt || new Date().toISOString() })),
      }));
      return { exercises: updated };
    });
  },

  tickWorkoutTimer: () => {
    const { isActive, isPaused, startTime, restTimerActive, restTimerEndsAt } = get();
    if (!isActive || isPaused) return;

    // Accurate timestamp difference
    const nextElapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    let nextRest = 0;
    let nextRestActive = false;

    if (restTimerActive && restTimerEndsAt) {
      const diff = Math.ceil((restTimerEndsAt - Date.now()) / 1000);
      if (diff > 0) {
        nextRest = diff;
        nextRestActive = true;
      } else {
        nextRest = 0;
        nextRestActive = false;
      }
    }

    set({
      elapsedSeconds: nextElapsed,
      restTimerSeconds: nextRest,
      restTimerActive: nextRestActive,
    });
  },

  startRestTimer: (duration = 90) => {
    const endsAt = Date.now() + duration * 1000;
    set({
      restTimerInitial: duration,
      restTimerSeconds: duration,
      restTimerActive: true,
      restTimerEndsAt: endsAt,
    });
  },

  adjustRestTimer: (delta: number) => {
    set(state => {
      const curEndsAt = state.restTimerEndsAt || Date.now();
      const newEndsAt = Math.max(Date.now(), curEndsAt + delta * 1000);
      const remaining = Math.ceil((newEndsAt - Date.now()) / 1000);
      return {
        restTimerEndsAt: newEndsAt,
        restTimerSeconds: remaining,
        restTimerActive: remaining > 0,
      };
    });
  },

  stopRestTimer: () => {
    set({ restTimerActive: false, restTimerSeconds: 0, restTimerEndsAt: null });
  },

  setRestSheetOpen: (open: boolean) => set({ isRestSheetOpen: open }),

  setActiveExerciseIndex: (idx: number) => {
    const ex = get().exercises[idx];
    set({
      activeExerciseIndex: idx,
      activeSetIndex: 0,
      activeFieldType: 'weight',
      activeInputString: ex?.sets[0] ? String(ex.sets[0].weight) : '',
    });
  },

  addExerciseToWorkout: (exercise: ExerciseRecord) => {
    set(state => {
      const historyStore = useWorkoutHistoryStore.getState();
      const pastSets = historyStore.getHistoryForExercise(exercise.id || exercise.name);
      const latestPastSet = pastSets && pastSets[0] ? pastSets[0] : null;
      const initialWeight = latestPastSet ? latestPastSet.weight : 135;

      const sets: LoggedSet[] = Array.from({ length: 3 }, (_, sIdx) => {
        const pastSetForIdx = pastSets && pastSets[sIdx] ? pastSets[sIdx] : latestPastSet;
        const prevPerf = pastSetForIdx ? `${pastSetForIdx.weight} lb × ${pastSetForIdx.reps}` : undefined;

        return {
          setNumber: sIdx + 1,
          type: 'normal',
          previousPerformance: prevPerf,
          previousWeight: pastSetForIdx ? pastSetForIdx.weight : undefined,
          previousReps: pastSetForIdx ? pastSetForIdx.reps : undefined,
          targetReps: '8-10 reps',
          weight: initialWeight,
          reps: 8,
          isCompleted: false,
        };
      });

      const newEx: ActiveWorkoutExercise = {
        instanceId: `ex_inst_${Date.now()}_${state.exercises.length}`,
        exerciseId: exercise.id || `custom_${Date.now()}`,
        name: exercise.name,
        category: exercise.category || 'Strength',
        target: exercise.target || 'Full Body',
        secondary: exercise.secondary || [],
        equipment: exercise.equipment || 'Barbell',
        image: exercise.image || '',
        gifUrl: exercise.gifUrl || '',
        sets,
      };

      const updated = [...state.exercises, newEx];
      return {
        exercises: updated,
        activeExerciseIndex: updated.length - 1,
      };
    });
  },

  swapExerciseInWorkout: (idx: number, exercise: ExerciseRecord) => {
    set(state => {
      if (idx < 0 || idx >= state.exercises.length) return state;
      const historyStore = useWorkoutHistoryStore.getState();
      const pastSets = historyStore.getHistoryForExercise(exercise.id || exercise.name);
      const latestPastSet = pastSets && pastSets[0] ? pastSets[0] : null;
      const initialWeight = latestPastSet ? latestPastSet.weight : 135;

      const currentSets = state.exercises[idx].sets;
      const sets: LoggedSet[] = currentSets.map((s, sIdx) => {
        const pastSetForIdx = pastSets && pastSets[sIdx] ? pastSets[sIdx] : latestPastSet;
        const prevPerf = pastSetForIdx ? `${pastSetForIdx.weight} lb × ${pastSetForIdx.reps}` : undefined;

        return {
          ...s,
          previousPerformance: prevPerf,
          previousWeight: pastSetForIdx ? pastSetForIdx.weight : undefined,
          previousReps: pastSetForIdx ? pastSetForIdx.reps : undefined,
          weight: s.isCompleted ? s.weight : initialWeight,
        };
      });

      const swappedEx: ActiveWorkoutExercise = {
        ...state.exercises[idx],
        exerciseId: exercise.id || state.exercises[idx].exerciseId,
        name: exercise.name,
        category: exercise.category || state.exercises[idx].category,
        target: exercise.target || state.exercises[idx].target,
        secondary: exercise.secondary || state.exercises[idx].secondary,
        equipment: exercise.equipment || state.exercises[idx].equipment,
        image: exercise.image || state.exercises[idx].image,
        gifUrl: exercise.gifUrl || state.exercises[idx].gifUrl,
        sets,
      };

      const updated = [...state.exercises];
      updated[idx] = swappedEx;
      return { exercises: updated };
    });
  },

  removeExerciseFromWorkout: (idx: number) => {
    set(state => {
      const updated = state.exercises.filter((_, i) => i !== idx);
      const nextActive = Math.max(0, Math.min(state.activeExerciseIndex, updated.length - 1));
      return {
        exercises: updated,
        activeExerciseIndex: nextActive,
      };
    });
  },

  reorderExercise: (fromIdx: number, toIdx: number) => {
    set(state => {
      if (fromIdx < 0 || fromIdx >= state.exercises.length || toIdx < 0 || toIdx >= state.exercises.length) {
        return state;
      }
      const updated = [...state.exercises];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return { exercises: updated, activeExerciseIndex: toIdx };
    });
  },

  updateExerciseNotes: (exerciseIndex: number, notes: string) => {
    set(state => {
      const ex = state.exercises[exerciseIndex];
      if (!ex) return state;
      const updatedExercises = [...state.exercises];
      updatedExercises[exerciseIndex] = { ...ex, notes };
      return { exercises: updatedExercises };
    });
  },

  addSet: (exerciseIndex: number, isWarmup = false) => {
    set(state => {
      const ex = state.exercises[exerciseIndex];
      if (!ex) return state;

      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: LoggedSet = {
        setNumber: ex.sets.length + 1,
        type: isWarmup ? 'warmup' : 'normal',
        previousPerformance: lastSet?.previousPerformance,
        weight: lastSet ? (isWarmup ? Math.round(lastSet.weight * 0.5) : lastSet.weight) : 135,
        reps: lastSet ? lastSet.reps : 8,
        isCompleted: false,
      };

      const updatedExercises = [...state.exercises];
      updatedExercises[exerciseIndex] = {
        ...ex,
        sets: [...ex.sets, newSet],
      };

      return { exercises: updatedExercises };
    });
  },

  removeSet: (exerciseIndex: number, setIndex: number) => {
    set(state => {
      const ex = state.exercises[exerciseIndex];
      if (!ex || ex.sets.length <= 1) return state;

      const updatedSets = ex.sets
        .filter((_, i) => i !== setIndex)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

      const updatedExercises = [...state.exercises];
      updatedExercises[exerciseIndex] = {
        ...ex,
        sets: updatedSets,
      };

      return { exercises: updatedExercises };
    });
  },

  toggleSetComplete: (exerciseIndex: number, setIndex: number) => {
    const state = get();
    const ex = state.exercises[exerciseIndex];
    if (!ex) return;
    const targetSet = ex.sets[setIndex];
    if (!targetSet) return;

    const willBeCompleted = !targetSet.isCompleted;

    if (willBeCompleted) {
      // Automatically start rest timer
      get().startRestTimer(state.restTimerInitial || 90);
    }

    const updatedSets = ex.sets.map((s, idx) => {
      if (idx !== setIndex) return s;
      return {
        ...s,
        isCompleted: willBeCompleted,
        completedAt: willBeCompleted ? new Date().toISOString() : undefined,
      };
    });

    const updatedExercises = [...state.exercises];
    updatedExercises[exerciseIndex] = {
      ...ex,
      sets: updatedSets,
    };

    // Auto-focus next uncompleted set
    let nextSetIdx = setIndex;
    if (willBeCompleted) {
      const firstIncomplete = updatedSets.findIndex((s, i) => i > setIndex && !s.isCompleted);
      if (firstIncomplete !== -1) {
        nextSetIdx = firstIncomplete;
      }
    }

    set({
      exercises: updatedExercises,
      activeSetIndex: nextSetIdx,
    });
  },

  setSetType: (exerciseIndex: number, setIndex: number, type: SetType) => {
    set(state => {
      const ex = state.exercises[exerciseIndex];
      if (!ex) return state;

      const updatedSets = ex.sets.map((s, idx) => (idx === setIndex ? { ...s, type } : s));
      const updatedExercises = [...state.exercises];
      updatedExercises[exerciseIndex] = { ...ex, sets: updatedSets };
      return { exercises: updatedExercises };
    });
  },

  setSetRir: (exerciseIndex: number, setIndex: number, rir: number) => {
    set(state => {
      const ex = state.exercises[exerciseIndex];
      if (!ex) return state;

      const updatedSets = ex.sets.map((s, idx) => (idx === setIndex ? { ...s, rir } : s));
      const updatedExercises = [...state.exercises];
      updatedExercises[exerciseIndex] = { ...ex, sets: updatedSets };
      return { exercises: updatedExercises };
    });
  },

  updateSetWeight: (exerciseIndex: number, setIndex: number, weight: number) => {
    set(state => {
      const ex = state.exercises[exerciseIndex];
      if (!ex) return state;
      const updatedSets = ex.sets.map((s, idx) => (idx === setIndex ? { ...s, weight } : s));
      const updatedExercises = [...state.exercises];
      updatedExercises[exerciseIndex] = { ...ex, sets: updatedSets };
      return { exercises: updatedExercises };
    });
  },

  updateSetReps: (exerciseIndex: number, setIndex: number, reps: number) => {
    set(state => {
      const ex = state.exercises[exerciseIndex];
      if (!ex) return state;
      const updatedSets = ex.sets.map((s, idx) => (idx === setIndex ? { ...s, reps } : s));
      const updatedExercises = [...state.exercises];
      updatedExercises[exerciseIndex] = { ...ex, sets: updatedSets };
      return { exercises: updatedExercises };
    });
  },

  focusField: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps') => {
    const ex = get().exercises[exerciseIndex];
    const s = ex?.sets[setIndex];
    const curVal = s ? (field === 'weight' ? String(s.weight) : String(s.reps)) : '';

    set({
      activeExerciseIndex: exerciseIndex,
      activeSetIndex: setIndex,
      activeFieldType: field,
      activeInputString: curVal,
    });
  },

  handleKeypadPress: (val: string) => {
    set(state => {
      const ex = state.exercises[state.activeExerciseIndex];
      if (!ex) return state;

      let nextStr = state.activeInputString;
      if (val === '.') {
        if (!nextStr.includes('.')) nextStr = nextStr ? `${nextStr}.` : '0.';
      } else {
        nextStr = nextStr === '0' ? val : nextStr + val;
      }

      const numVal = parseFloat(nextStr) || 0;
      const updatedSets = ex.sets.map((s, idx) => {
        if (idx !== state.activeSetIndex) return s;
        return state.activeFieldType === 'weight' ? { ...s, weight: numVal } : { ...s, reps: Math.round(numVal) };
      });

      const updatedExercises = [...state.exercises];
      updatedExercises[state.activeExerciseIndex] = { ...ex, sets: updatedSets };

      return {
        activeInputString: nextStr,
        exercises: updatedExercises,
      };
    });
  },

  handleKeypadBackspace: () => {
    set(state => {
      const ex = state.exercises[state.activeExerciseIndex];
      if (!ex) return state;

      const nextStr = state.activeInputString.slice(0, -1);
      const numVal = parseFloat(nextStr) || 0;

      const updatedSets = ex.sets.map((s, idx) => {
        if (idx !== state.activeSetIndex) return s;
        return state.activeFieldType === 'weight' ? { ...s, weight: numVal } : { ...s, reps: Math.round(numVal) };
      });

      const updatedExercises = [...state.exercises];
      updatedExercises[state.activeExerciseIndex] = { ...ex, sets: updatedSets };

      return {
        activeInputString: nextStr,
        exercises: updatedExercises,
      };
    });
  },

  handleKeypadIncrement: (delta: number) => {
    set(state => {
      const ex = state.exercises[state.activeExerciseIndex];
      if (!ex) return state;

      const curSet = ex.sets[state.activeSetIndex];
      if (!curSet) return state;

      const curVal = state.activeFieldType === 'weight' ? curSet.weight : curSet.reps;
      const newVal = Math.max(0, curVal + delta);
      const newStr = String(newVal);

      const updatedSets = ex.sets.map((s, idx) => {
        if (idx !== state.activeSetIndex) return s;
        return state.activeFieldType === 'weight' ? { ...s, weight: newVal } : { ...s, reps: Math.round(newVal) };
      });

      const updatedExercises = [...state.exercises];
      updatedExercises[state.activeExerciseIndex] = { ...ex, sets: updatedSets };

      return {
        activeInputString: newStr,
        exercises: updatedExercises,
      };
    });
  },

  handleKeypadNext: () => {
    const state = get();
    const ex = state.exercises[state.activeExerciseIndex];
    if (!ex) return;

    if (state.activeFieldType === 'weight') {
      const curSet = ex.sets[state.activeSetIndex];
      set({
        activeFieldType: 'reps',
        activeInputString: curSet ? String(curSet.reps) : '',
      });
    } else {
      if (state.activeSetIndex < ex.sets.length - 1) {
        const nextIdx = state.activeSetIndex + 1;
        const nextSet = ex.sets[nextIdx];
        set({
          activeSetIndex: nextIdx,
          activeFieldType: 'weight',
          activeInputString: nextSet ? String(nextSet.weight) : '',
        });
      }
    }
  },
}));

export default useWorkoutSessionStore;
