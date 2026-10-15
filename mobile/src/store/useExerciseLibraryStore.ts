import { create } from 'zustand';
import rawExercises from '../data/exercisesData.json';
import { ExerciseRecord } from '../utils/muscleTargetMapper';

const ALL_EXERCISES: ExerciseRecord[] = (rawExercises as unknown) as ExerciseRecord[];

export const EQUIPMENT_OPTIONS = [
  'All',
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Body Weight',
  'Smith Machine',
  'Leverage Machine',
  'Band',
  'Kettlebell',
] as const;

export const CATEGORY_OPTIONS = [
  'All',
  'Chest',
  'Back',
  'Upper Legs',
  'Upper Arms',
  'Shoulders',
  'Waist',
  'Lower Legs',
  'Lower Arms',
  'Cardio',
] as const;

interface ExerciseLibraryState {
  exercises: ExerciseRecord[];
  searchQuery: string;
  selectedCategory: string;
  selectedEquipment: string;
  selectedTarget: string | null;
  favoriteIds: string[];

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedEquipment: (equipment: string) => void;
  setSelectedTarget: (target: string | null) => void;
  toggleFavorite: (id: string) => void;
  addCustomExercise: (ex: Omit<ExerciseRecord, 'id'>) => ExerciseRecord;
  getFilteredExercises: () => ExerciseRecord[];
  getExerciseById: (id: string) => ExerciseRecord | undefined;
}

import { createMMKV, type MMKV } from 'react-native-mmkv';

const customExerciseStorage: MMKV = createMMKV({ id: 'fitmatrix-custom-exercises' });

const loadCustomExercises = (): ExerciseRecord[] => {
  try {
    const raw = customExerciseStorage.getString('custom_exercises');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[useExerciseLibraryStore] Failed to load custom exercises', e);
  }
  return [];
};

const savedCustom = loadCustomExercises();
const INITIAL_EXERCISES: ExerciseRecord[] = [...savedCustom, ...ALL_EXERCISES];

export const useExerciseLibraryStore = create<ExerciseLibraryState>((set, get) => ({
  exercises: INITIAL_EXERCISES,
  searchQuery: '',
  selectedCategory: 'All',
  selectedEquipment: 'All',
  selectedTarget: null,
  favoriteIds: [],

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory: string) => set({ selectedCategory }),
  setSelectedEquipment: (selectedEquipment: string) => set({ selectedEquipment }),
  setSelectedTarget: (selectedTarget: string | null) => set({ selectedTarget }),

  toggleFavorite: (id: string) => {
    set(state => {
      const exists = state.favoriteIds.includes(id);
      return {
        favoriteIds: exists
          ? state.favoriteIds.filter(fId => fId !== id)
          : [...state.favoriteIds, id],
      };
    });
  },

  addCustomExercise: (ex: Omit<ExerciseRecord, 'id'>) => {
    const newEx: ExerciseRecord = {
      ...ex,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    set(state => {
      const updated = [newEx, ...state.exercises];
      try {
        const customOnly = updated.filter(e => e.id.startsWith('custom_'));
        customExerciseStorage.set('custom_exercises', JSON.stringify(customOnly));
      } catch (err) {
        console.warn('[useExerciseLibraryStore] Failed to persist custom exercises', err);
      }
      return { exercises: updated };
    });
    return newEx;
  },

  getExerciseById: (id: string) => {
    return ALL_EXERCISES.find(e => e.id === id);
  },

  getFilteredExercises: () => {
    const { searchQuery, selectedCategory, selectedEquipment, selectedTarget } = get();

    const query = searchQuery.trim().toLowerCase();
    const cat = selectedCategory.toLowerCase();
    const eq = selectedEquipment.toLowerCase();
    const tgt = selectedTarget?.toLowerCase();

    return ALL_EXERCISES.filter(exercise => {
      // Search query filter (matches name, target, or equipment)
      if (query) {
        const matchesName = exercise.name.toLowerCase().includes(query);
        const matchesTarget = exercise.target.toLowerCase().includes(query);
        const matchesEq = exercise.equipment.toLowerCase().includes(query);
        if (!matchesName && !matchesTarget && !matchesEq) {
          return false;
        }
      }

      // Category filter
      if (cat !== 'all' && exercise.category.toLowerCase() !== cat) {
        return false;
      }

      // Equipment filter
      if (eq !== 'all') {
        const itemEq = exercise.equipment.toLowerCase();
        if (eq === 'machine') {
          if (!itemEq.includes('machine') && !itemEq.includes('leverage')) {
            return false;
          }
        } else if (!itemEq.includes(eq)) {
          return false;
        }
      }

      // Target filter
      if (tgt && exercise.target.toLowerCase() !== tgt) {
        return false;
      }

      return true;
    });
  },
}));
