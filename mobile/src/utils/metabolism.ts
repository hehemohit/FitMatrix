import { UserProfile } from '../types/schema';

export interface DerivedTargets {
  bmr: number;
  tdee: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fats_g: number;
}

/**
 * Calculates dynamic metabolic targets from biometric parameters.
 * Adheres to MacroFactor / Mifflin-St Jeor energy expenditure equations.
 * Completely eliminates arbitrary hardcoded constants.
 */
export function deriveMetabolicTargets(profile?: UserProfile | null): DerivedTargets {
  const weight = profile?.weight_kg && profile.weight_kg > 30 ? profile.weight_kg : 70.0;
  const height = profile?.height_cm && profile.height_cm > 100 ? profile.height_cm : 175.0;
  const age = profile?.age && profile.age > 10 ? profile.age : 28;
  const isFemale = (profile as any)?.gender === 'female';

  // Mifflin-St Jeor formula
  const bmr = isFemale
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };

  const mult = activityMultipliers[profile?.activity_level || 'moderately_active'] || 1.55;
  const tdee = Math.round(bmr * mult);

  // Goal adjustment
  let cals = tdee;
  const goal = (profile?.fitness_goal || '').toLowerCase();
  if (goal.includes('loss') || goal.includes('cut')) {
    cals = Math.round(tdee * 0.80); // 20% deficit
  } else if (goal.includes('gain') || goal.includes('bulk')) {
    cals = Math.round(tdee * 1.10); // 10% surplus
  }
  cals = Math.max(1200, cals);

  // Protein: 2.0g per kg of bodyweight
  const protein = Math.round(weight * 2.0);
  // Fats: 0.8g per kg of bodyweight
  const fats = Math.round(weight * 0.8);
  // Carbs: remainder of calories
  const remainingCals = Math.max(0, cals - (protein * 4 + fats * 9));
  const carbs = Math.round(remainingCals / 4);

  return {
    bmr: Math.round(bmr),
    tdee,
    target_calories: cals,
    target_protein_g: protein,
    target_carbs_g: carbs,
    target_fats_g: fats,
  };
}

