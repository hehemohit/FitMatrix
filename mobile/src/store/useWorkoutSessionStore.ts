import { create } from 'zustand';
import { ExerciseRecord } from '../utils/muscleTargetMapper';

export interface LoggedSet {
  setNumber: number;
  previousPerformance?: string;
  targetReps?: string;
  targetRir?: number;
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

  // Sets
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  focusField: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps') => void;

  // Keypad
  handleKeypadPress: (val: string) => void;
  handleKeypadBackspace: () => void;
  handleKeypadIncrement: (delta: number) => void;
  handleKeypadNext: () => void;
}

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  isActive: false,
  isPaused: false,
  isMinimized: false,
  workoutName: 'Live Workout',
  startTime: null,
  elapsedSeconds: 0,

  restTimerSeconds: 0,
  restTimerInitial: 90,
  restTimerActive: false,
  isRestSheetOpen: false,

  exercises: [],
  activeExerciseIndex: 0,
  activeSetIndex: 0,
  activeFieldType: 'weight',
  activeInputString: '',

  startWorkout: (name = 'Workout Session', initialExercises = []) => {
    const formattedExercises: ActiveWorkoutExercise[] = initialExercises.map((e, idx) => {
      const setCount = e.targetSets && e.targetSets > 0 ? e.targetSets : 3;
      const targetRepsStr = e.targetReps ? `${e.targetReps} reps` : '8-10 reps';
      const defaultReps = typeof e.targetReps === 'number' ? e.targetReps : 8;

      const sets = Array.from({ length: setCount }, (_, sIdx) => ({
        setNumber: sIdx + 1,
        weight: 135,
        reps: defaultReps,
        targetReps: targetRepsStr,
        targetRir: 2,
        isCompleted: false,
      }));

      return {
        instanceId: `inst_${Date.now()}_${idx}`,
        exerciseId: e.id,
        name: e.name,
        category: e.category,
        target: e.target,
        secondary: e.secondary,
        equipment: e.equipment,
        image: e.image,
        gifUrl: e.gifUrl,
        sets,
      };
    });

    set({
      isActive: true,
      isPaused: false,
      isMinimized: false,
      workoutName: name,
      startTime: Date.now(),
      elapsedSeconds: 0,
      restTimerSeconds: 0,
      restTimerActive: false,
      isRestSheetOpen: false,
      exercises: formattedExercises,
      activeExerciseIndex: 0,
      activeSetIndex: 0,
      activeFieldType: 'weight',
      activeInputString: formattedExercises[0]?.sets[0] ? String(formattedExercises[0].sets[0].weight) : '',
    });
  },

  pauseWorkout: () => set({ isPaused: true }),
  resumeWorkout: () => set({ isPaused: false }),
  minimizeWorkout: (isMinimized: boolean) => set({ isMinimized }),

  discardWorkout: () => {
    set({
      isActive: false,
      isPaused: false,
      isMinimized: false,
      startTime: null,
      elapsedSeconds: 0,
      restTimerActive: false,
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

    set({
      isActive: false,
      isPaused: false,
      isMinimized: false,
      restTimerActive: false,
    });

    return summary;
  },

  tickWorkoutTimer: () => {
    const { isActive, isPaused, startTime, restTimerActive, restTimerSeconds } = get();
    if (!isActive || isPaused) return;

    const nextElapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    let nextRest = restTimerSeconds;
    let nextRestActive = restTimerActive;

    if (restTimerActive) {
      if (restTimerSeconds > 1) {
        nextRest = restTimerSeconds - 1;
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
    set({
      restTimerInitial: duration,
      restTimerSeconds: duration,
      restTimerActive: true,
    });
  },

  adjustRestTimer: (delta: number) => {
    set(state => {
      const updated = Math.max(0, state.restTimerSeconds + delta);
      return {
        restTimerSeconds: updated,
        restTimerActive: updated > 0,
      };
    });
  },

  stopRestTimer: () => set({ restTimerActive: false, restTimerSeconds: 0 }),
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
      const newEx: ActiveWorkoutExercise = {
        instanceId: `inst_${Date.now()}_${state.exercises.length}`,
        exerciseId: exercise.id,
        name: exercise.name,
        category: exercise.category,
        target: exercise.target,
        secondary: exercise.secondary,
        equipment: exercise.equipment,
        image: exercise.image,
        gifUrl: exercise.gifUrl,
        sets: [
          { setNumber: 1, weight: 135, reps: 8, targetReps: '8-10 reps', targetRir: 2, isCompleted: false },
          { setNumber: 2, weight: 135, reps: 8, targetReps: '8-10 reps', targetRir: 2, isCompleted: false },
          { setNumber: 3, weight: 135, reps: 8, targetReps: '8-10 reps', targetRir: 2, isCompleted: false },
        ],
      };
      return {
        exercises: [...state.exercises, newEx],
        activeExerciseIndex: state.exercises.length,
      };
    });
  },

  swapExerciseInWorkout: (idx: number, exercise: ExerciseRecord) => {
    set(state => {
      const updated = [...state.exercises];
      if (!updated[idx]) return state;
      updated[idx] = {
        ...updated[idx],
        exerciseId: exercise.id,
        name: exercise.name,
        category: exercise.category,
        target: exercise.target,
        secondary: exercise.secondary,
        equipment: exercise.equipment,
        image: exercise.image,
        gifUrl: exercise.gifUrl,
      };
      return { exercises: updated };
    });
  },

  removeExerciseFromWorkout: (idx: number) => {
    set(state => {
      const updated = state.exercises.filter((_, i) => i !== idx);
      const nextIdx = Math.min(state.activeExerciseIndex, Math.max(0, updated.length - 1));
      return { exercises: updated, activeExerciseIndex: nextIdx };
    });
  },

  addSet: (exerciseIndex: number) => {
    set(state => {
      const updated = [...state.exercises];
      const ex = updated[exerciseIndex];
      if (!ex) return state;

      const lastSet = ex.sets[ex.sets.length - 1];
      const newSetNum = ex.sets.length + 1;
      const newSet: LoggedSet = {
        setNumber: newSetNum,
        weight: lastSet ? lastSet.weight : 135,
        reps: lastSet ? lastSet.reps : 8,
        targetReps: lastSet?.targetReps,
        targetRir: lastSet?.targetRir,
        isCompleted: false,
      };

      ex.sets = [...ex.sets, newSet];
      return { exercises: updated };
    });
  },

  removeSet: (exerciseIndex: number, setIndex: number) => {
    set(state => {
      const updated = [...state.exercises];
      const ex = updated[exerciseIndex];
      if (!ex || ex.sets.length <= 1) return state;

      ex.sets = ex.sets.filter((_, i) => i !== setIndex).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return { exercises: updated };
    });
  },

  toggleSetComplete: (exerciseIndex: number, setIndex: number) => {
    const state = get();
    const updated = [...state.exercises];
    const ex = updated[exerciseIndex];
    if (!ex) return;

    const setObj = ex.sets[setIndex];
    if (!setObj) return;

    const nextCompleted = !setObj.isCompleted;
    setObj.isCompleted = nextCompleted;
    setObj.completedAt = nextCompleted ? new Date().toISOString() : undefined;

    // Trigger Rest Timer automatically when marking complete
    if (nextCompleted) {
      state.startRestTimer(state.restTimerInitial || 90);

      // Auto-advance logic
      const nextSetIdx = setIndex + 1;
      if (nextSetIdx < ex.sets.length) {
        set({
          exercises: updated,
          activeSetIndex: nextSetIdx,
          activeFieldType: 'weight',
          activeInputString: String(ex.sets[nextSetIdx].weight),
        });
        return;
      } else if (exerciseIndex + 1 < updated.length) {
        // Auto-advance to next exercise if all sets complete
        const nextEx = updated[exerciseIndex + 1];
        set({
          exercises: updated,
          activeExerciseIndex: exerciseIndex + 1,
          activeSetIndex: 0,
          activeFieldType: 'weight',
          activeInputString: nextEx.sets[0] ? String(nextEx.sets[0].weight) : '',
        });
        return;
      }
    }

    set({ exercises: updated });
  },

  focusField: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps') => {
    const ex = get().exercises[exerciseIndex];
    const s = ex?.sets[setIndex];
    const currentVal = s ? (field === 'weight' ? s.weight : s.reps) : 0;
    set({
      activeExerciseIndex: exerciseIndex,
      activeSetIndex: setIndex,
      activeFieldType: field,
      activeInputString: String(currentVal),
    });
  },

  handleKeypadPress: (val: string) => {
    const { activeInputString, activeExerciseIndex, activeSetIndex, activeFieldType, exercises } = get();
    let nextStr = activeInputString;

    if (val === '.') {
      if (!nextStr.includes('.')) {
        nextStr = nextStr ? `${nextStr}.` : '0.';
      }
    } else {
      nextStr = nextStr === '0' ? val : `${nextStr}${val}`;
    }

    const numVal = parseFloat(nextStr) || 0;
    const updated = [...exercises];
    const ex = updated[activeExerciseIndex];
    if (ex && ex.sets[activeSetIndex]) {
      if (activeFieldType === 'weight') {
        ex.sets[activeSetIndex].weight = numVal;
      } else {
        ex.sets[activeSetIndex].reps = Math.round(numVal);
      }
    }

    set({ activeInputString: nextStr, exercises: updated });
  },

  handleKeypadBackspace: () => {
    const { activeInputString, activeExerciseIndex, activeSetIndex, activeFieldType, exercises } = get();
    if (!activeInputString) return;

    const nextStr = activeInputString.slice(0, -1);
    const numVal = parseFloat(nextStr) || 0;

    const updated = [...exercises];
    const ex = updated[activeExerciseIndex];
    if (ex && ex.sets[activeSetIndex]) {
      if (activeFieldType === 'weight') {
        ex.sets[activeSetIndex].weight = numVal;
      } else {
        ex.sets[activeSetIndex].reps = Math.round(numVal);
      }
    }

    set({ activeInputString: nextStr, exercises: updated });
  },

  handleKeypadIncrement: (delta: number) => {
    const { activeExerciseIndex, activeSetIndex, activeFieldType, exercises } = get();
    const updated = [...exercises];
    const ex = updated[activeExerciseIndex];
    if (!ex || !ex.sets[activeSetIndex]) return;

    const s = ex.sets[activeSetIndex];
    if (activeFieldType === 'weight') {
      s.weight = Math.max(0, s.weight + delta);
      set({ activeInputString: String(s.weight), exercises: updated });
    } else {
      s.reps = Math.max(0, s.reps + delta);
      set({ activeInputString: String(s.reps), exercises: updated });
    }
  },

  handleKeypadNext: () => {
    const { activeFieldType, activeExerciseIndex, activeSetIndex, exercises, toggleSetComplete } = get();
    const ex = exercises[activeExerciseIndex];
    if (!ex || !ex.sets[activeSetIndex]) return;

    if (activeFieldType === 'weight') {
      // Advance to Reps
      set({
        activeFieldType: 'reps',
        activeInputString: String(ex.sets[activeSetIndex].reps),
      });
    } else {
      // Mark set complete and auto-advance
      toggleSetComplete(activeExerciseIndex, activeSetIndex);
    }
  },
}));
