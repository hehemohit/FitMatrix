import { ExerciseRecord } from './muscleTargetMapper';

export type DiscomfortRegion = 'lower_back' | 'shoulder' | 'knee' | 'wrist_elbow';

export interface DiscomfortOption {
  key: DiscomfortRegion;
  label: string;
  emoji: string;
  description: string;
}

export const DISCOMFORT_REGIONS: DiscomfortOption[] = [
  {
    key: 'lower_back',
    label: 'Lower Back / Spine',
    emoji: '🦴',
    description: 'Compressive axial load or lumbar fatigue',
  },
  {
    key: 'shoulder',
    label: 'Shoulder / Rotator Cuff',
    emoji: '💪',
    description: 'Anterior capsule impingement or joint ache',
  },
  {
    key: 'knee',
    label: 'Knee / Patellar Tendon',
    emoji: '🦵',
    description: 'Front knee ache or tendon strain',
  },
  {
    key: 'wrist_elbow',
    label: 'Elbow / Wrist',
    emoji: '✋',
    description: 'Tendonitis or extreme supination strain',
  },
];

export interface BiomechanicalSuggestion {
  replacement: ExerciseRecord;
  reason: string;
}

function makeSub(rec: {
  id: string;
  name: string;
  category: string;
  target: string;
  secondary?: string[];
  equipment: string;
}): ExerciseRecord {
  return {
    secondary: [],
    image: '',
    gifUrl: '',
    ...rec,
  };
}

/**
 * Recommends a joint-friendly, axial-safe substitution for an active exercise
 * based on clinical sports science and RP Hypertrophy guidelines.
 * Executes instantly (0ms, 0 tokens) with zero network dependency.
 */
export function findBiomechanicalSubstitution(
  currentExerciseName: string,
  region: DiscomfortRegion
): BiomechanicalSuggestion {
  const name = currentExerciseName.toLowerCase();

  // 1. Lower Back / Axial Load Substitutions
  if (region === 'lower_back') {
    if (name.includes('squat')) {
      return {
        replacement: makeSub({
          id: 'sub_hack_squat',
          name: 'Hack Squat (Machine)',
          category: 'upper legs',
          target: 'quadriceps',
          secondary: ['glutes'],
          equipment: 'machine',
        }),
        reason: 'Removes vertical compressive loading on vertebrae L1–L5 while isolating quads with back pad support.',
      };
    }
    if (name.includes('deadlift')) {
      return {
        replacement: makeSub({
          id: 'sub_trap_bar',
          name: 'Trap Bar Deadlift (High Handles)',
          category: 'upper legs',
          target: 'glutes',
          secondary: ['quadriceps', 'hamstrings'],
          equipment: 'trap bar',
        }),
        reason: 'Keeps load centered inside the base of support, reducing lumbar spine shear stress by up to 28%.',
      };
    }
    if (name.includes('row') || name.includes('bent')) {
      return {
        replacement: makeSub({
          id: 'sub_chest_supported_row',
          name: 'Chest-Supported T-Bar Row',
          category: 'back',
          target: 'lats',
          secondary: ['biceps', 'rhomboids'],
          equipment: 'machine',
        }),
        reason: 'Chest pad braces the upper torso, completely unweighting spinal erectors while maximizing lat recruitment.',
      };
    }
    if (name.includes('overhead') || name.includes('military') || name.includes('press')) {
      return {
        replacement: makeSub({
          id: 'sub_seated_db_press',
          name: 'Seated Dumbbell Overhead Press (Back Supported)',
          category: 'shoulders',
          target: 'deltoids',
          secondary: ['triceps'],
          equipment: 'dumbbell',
        }),
        reason: 'Vertical back support prevents lumbar hyperextension under overhead loads.',
      };
    }
    // Generic back swap
    return {
      replacement: makeSub({
        id: 'sub_leg_press',
        name: '45° Leg Press',
        category: 'upper legs',
        target: 'quadriceps',
        secondary: ['glutes'],
        equipment: 'machine',
      }),
      reason: 'Locks hips and sacrum into a fixed back angle, eliminating spinal loading.',
    };
  }

  // 2. Shoulder / Rotator Cuff Substitutions
  if (region === 'shoulder') {
    if (name.includes('bench') || name.includes('chest press') || name.includes('push up')) {
      return {
        replacement: makeSub({
          id: 'sub_floor_press',
          name: 'Dumbbell Floor Press (Neutral Grip)',
          category: 'chest',
          target: 'pectorals',
          secondary: ['triceps', 'front_delts'],
          equipment: 'dumbbell',
        }),
        reason: 'Floor restricts end-range humerus hyperextension, protecting the anterior capsule and labrum.',
      };
    }
    if (name.includes('overhead') || name.includes('shoulder press')) {
      return {
        replacement: makeSub({
          id: 'sub_landmine_press',
          name: 'Half-Kneeling Landmine Press',
          category: 'shoulders',
          target: 'deltoids',
          secondary: ['triceps'],
          equipment: 'barbell',
        }),
        reason: 'Angled pressing arc allows natural scapular upward rotation without subacromial impingement.',
      };
    }
    if (name.includes('dip')) {
      return {
        replacement: makeSub({
          id: 'sub_rope_pushdown',
          name: 'Cable Triceps Pushdown (Rope)',
          category: 'arms',
          target: 'triceps',
          secondary: ['forearms'],
          equipment: 'cable',
        }),
        reason: 'Completely eliminates extreme anterior shoulder stretch at the bottom of the dip.',
      };
    }
    return {
      replacement: makeSub({
        id: 'sub_cable_lateral_raise',
        name: 'Cable Lateral Raise (Scapular Plane)',
        category: 'shoulders',
        target: 'deltoids',
        secondary: [],
        equipment: 'cable',
      }),
      reason: 'Provides continuous tension strictly in the scapular plane (30° anterior to frontal plane).',
    };
  }

  // 3. Knee / Patellar Tendon Substitutions
  if (region === 'knee') {
    if (name.includes('squat') || name.includes('lunge')) {
      return {
        replacement: makeSub({
          id: 'sub_box_squat',
          name: 'Box Squat (Vertical Shin)',
          category: 'upper legs',
          target: 'glutes',
          secondary: ['hamstrings', 'quadriceps'],
          equipment: 'barbell',
        }),
        reason: 'Vertical shin angle shifts shear stress backward onto the powerful glutes and hamstrings.',
      };
    }
    if (name.includes('extension')) {
      return {
        replacement: makeSub({
          id: 'sub_rdl',
          name: 'Romanian Deadlift (Dumbbell)',
          category: 'upper legs',
          target: 'hamstrings',
          secondary: ['glutes'],
          equipment: 'dumbbell',
        }),
        reason: 'Shifts knee extension shear into a pure hip-hinge hamstring and posterior chain stimulus.',
      };
    }
    return {
      replacement: makeSub({
        id: 'sub_reverse_lunge',
        name: 'Reverse Lunge (Deficit)',
        category: 'upper legs',
        target: 'quadriceps',
        secondary: ['glutes'],
        equipment: 'dumbbell',
      }),
      reason: 'Stepping backward reduces peak anterior patellar tendon acceleration.',
    };
  }

  // 4. Wrist & Elbow Substitutions
  if (name.includes('curl')) {
    return {
      replacement: makeSub({
        id: 'sub_hammer_curl',
        name: 'Dumbbell Hammer Curl (Neutral Grip)',
        category: 'arms',
        target: 'biceps',
        secondary: ['forearms'],
        equipment: 'dumbbell',
      }),
      reason: 'Semipronated grip relieves medial epicondyle torque and isolates the brachioradialis.',
    };
  }
  return {
    replacement: makeSub({
      id: 'sub_cable_pushdown',
      name: 'Cable Triceps Pushdown (Straight Bar)',
      category: 'arms',
      target: 'triceps',
      secondary: ['forearms'],
      equipment: 'cable',
    }),
    reason: 'Even cable resistance reduces peak joint strain compared to free weight gravity curves.',
  };
}
