import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import { syncWeeklySchedule } from '../api/coachApi';

const storage: MMKV = createMMKV({ id: 'fitmatrix-workout-schedule' });

export interface RoutineScheduleItem {
  id: string;
  name: string;
  exerciseCount: number;
  exerciseIds?: string[];
  iconType: 'push' | 'pull' | 'legs';
}

export interface DaySchedule {
  dayName: string;
  isRest: boolean;
  routines: RoutineScheduleItem[];
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  {
    dayName: 'Monday',
    isRest: false,
    routines: [{ id: 'r_mon_1', name: 'Push Day', exerciseCount: 6, iconType: 'push' }],
  },
  {
    dayName: 'Tuesday',
    isRest: true,
    routines: [],
  },
  {
    dayName: 'Wednesday',
    isRest: false,
    routines: [{ id: 'r_wed_1', name: 'Pull Day', exerciseCount: 5, iconType: 'pull' }],
  },
  {
    dayName: 'Thursday',
    isRest: true,
    routines: [],
  },
  {
    dayName: 'Friday',
    isRest: false,
    routines: [{ id: 'r_fri_1', name: 'Leg Day', exerciseCount: 6, iconType: 'legs' }],
  },
  {
    dayName: 'Saturday',
    isRest: true,
    routines: [],
  },
  {
    dayName: 'Sunday',
    isRest: true,
    routines: [],
  },
];

interface WorkoutScheduleState {
  schedule: DaySchedule[];

  // Actions
  toggleRestDay: (dayIndex: number) => void;
  addRoutine: (dayIndex: number, name: string, exerciseCount?: number, iconType?: 'push' | 'pull' | 'legs') => void;
  removeRoutine: (dayIndex: number, routineId: string) => void;
  addExerciseToDayRoutine: (dayName: string, exerciseId: string) => void;
  getPlannedWorkoutDaysCount: () => number;
  resetToDefault: () => void;
}

const loadScheduleFromStorage = (): DaySchedule[] => {
  try {
    const raw = storage.getString('weekly_schedule');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[useWorkoutScheduleStore] Failed to load schedule from MMKV', e);
  }
  return DEFAULT_SCHEDULE;
};

const saveScheduleToStorage = (schedule: DaySchedule[]) => {
  try {
    storage.set('weekly_schedule', JSON.stringify(schedule));
  } catch (e) {
    console.warn('[useWorkoutScheduleStore] Failed to persist schedule to MMKV', e);
  }
  syncWeeklySchedule(schedule).catch(err => {
    console.warn('[useWorkoutScheduleStore] Background schedule cloud sync failed:', err);
  });
};

export const useWorkoutScheduleStore = create<WorkoutScheduleState>((set, get) => ({
  schedule: loadScheduleFromStorage(),

  toggleRestDay: (dayIndex: number) => {
    set(state => {
      const updated = state.schedule.map((day, idx) => {
        if (idx !== dayIndex) return day;
        if (day.isRest) {
          return {
            ...day,
            isRest: false,
            routines: [
              {
                id: `r_${Date.now()}`,
                name: 'Custom Workout',
                exerciseCount: 4,
                iconType: 'push' as const,
              },
            ],
          };
        } else {
          return {
            ...day,
            isRest: true,
            routines: [],
          };
        }
      });
      saveScheduleToStorage(updated);
      return { schedule: updated };
    });
  },

  addRoutine: (dayIndex, name, exerciseCount = 4, iconType = 'push') => {
    set(state => {
      const updated = state.schedule.map((day, idx) => {
        if (idx !== dayIndex) return day;
        const newRoutine: RoutineScheduleItem = {
          id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name,
          exerciseCount,
          iconType,
        };
        return {
          ...day,
          isRest: false,
          routines: [...day.routines, newRoutine],
        };
      });
      saveScheduleToStorage(updated);
      return { schedule: updated };
    });
  },

  removeRoutine: (dayIndex, routineId) => {
    set(state => {
      const updated = state.schedule.map((day, idx) => {
        if (idx !== dayIndex) return day;
        const remainingRoutines = day.routines.filter(r => r.id !== routineId);
        return {
          ...day,
          isRest: remainingRoutines.length === 0,
          routines: remainingRoutines,
        };
      });
      saveScheduleToStorage(updated);
      return { schedule: updated };
    });
  },

  addExerciseToDayRoutine: (dayName, exerciseId) => {
    set(state => {
      const updated = state.schedule.map(day => {
        if (day.dayName.toLowerCase() !== dayName.toLowerCase()) return day;
        if (day.routines.length === 0) {
          // create a routine if none exists
          return {
            ...day,
            isRest: false,
            routines: [
              {
                id: `r_${Date.now()}`,
                name: `${day.dayName} Workout`,
                exerciseCount: 1,
                exerciseIds: [exerciseId],
                iconType: 'push' as const,
              },
            ],
          };
        }
        // Append to first routine of that day
        const firstRoutine = day.routines[0];
        const existingIds = firstRoutine.exerciseIds || [];
        const updatedRoutine: RoutineScheduleItem = {
          ...firstRoutine,
          exerciseCount: firstRoutine.exerciseCount + 1,
          exerciseIds: [...existingIds, exerciseId],
        };
        return {
          ...day,
          routines: [updatedRoutine, ...day.routines.slice(1)],
        };
      });
      saveScheduleToStorage(updated);
      return { schedule: updated };
    });
  },

  getPlannedWorkoutDaysCount: () => {
    return get().schedule.filter(d => !d.isRest).length;
  },

  resetToDefault: () => {
    saveScheduleToStorage(DEFAULT_SCHEDULE);
    set({ schedule: DEFAULT_SCHEDULE });
  },
}));

export default useWorkoutScheduleStore;
