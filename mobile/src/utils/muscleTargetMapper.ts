/**
 * Muscle Target Mapper
 * Maps exercises-dataset target and category strings to SVG anatomical muscle keys.
 */

export type MuscleKey =
  | 'chest'
  | 'front_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'traps'
  | 'lats'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves_front'
  | 'calves_back';

export interface ExerciseRecord {
  id: string;
  name: string;
  category: string;
  target: string;
  secondary: string[];
  equipment: string;
  image: string;
  gifUrl: string;
  instructions?: string[] | string;
}

const TARGET_MAP: Record<string, MuscleKey[]> = {
  // Chest
  pectorals: ['chest'],
  chest: ['chest'],

  // Deltoids
  delts: ['front_delts', 'rear_delts'],
  shoulders: ['front_delts', 'rear_delts'],
  'anterior deltoid': ['front_delts'],
  'posterior deltoid': ['rear_delts'],

  // Arms
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearms'],
  'lower arms': ['forearms'],

  // Back
  lats: ['lats'],
  traps: ['traps'],
  'upper back': ['traps', 'lats'],
  'levator scapulae': ['traps'],
  neck: ['traps'],
  spine: ['lower_back'],
  'lower back': ['lower_back'],

  // Core / Waist
  abs: ['abs'],
  waist: ['abs'],
  'serratus anterior': ['abs', 'chest'],

  // Lower Body
  quads: ['quads'],
  quadriceps: ['quads'],
  'upper legs': ['quads', 'hamstrings'],
  hamstrings: ['hamstrings'],
  glutes: ['glutes'],
  abductors: ['glutes'],
  adductors: ['adductors'],
  calves: ['calves_front', 'calves_back'],
  'lower legs': ['calves_front', 'calves_back'],
};

/**
 * Maps an exercise target and secondary muscles to front and back MuscleKeys.
 */
export function mapExerciseToMuscles(target: string, secondary: string[] = []): {
  primary: MuscleKey[];
  secondary: MuscleKey[];
} {
  const normTarget = target.trim().toLowerCase();
  const primary = TARGET_MAP[normTarget] || [];

  const secKeys: MuscleKey[] = [];
  secondary.forEach(sec => {
    const matched = TARGET_MAP[sec.trim().toLowerCase()];
    if (matched) {
      matched.forEach(k => {
        if (!primary.includes(k) && !secKeys.includes(k)) {
          secKeys.push(k);
        }
      });
    }
  });

  return { primary, secondary: secKeys };
}
