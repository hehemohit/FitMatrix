/**
 * athleteSelectors.ts — Pure Memoized Reactive Selectors
 *
 * Eliminates all mutable scalar counters across the application.
 * All daily totals, dynamic TDEE, and remaining targets are derived
 * directly from canonical entry arrays with zero drift.
 */

import {
  UnifiedAthleteProfile,
  DailyJournalAggregate,
} from '../../types/unifiedSchema';

export const selectCaloriesLogged = (journal: DailyJournalAggregate): number =>
  journal.meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

export const selectProteinLoggedG = (journal: DailyJournalAggregate): number =>
  journal.meals.reduce((sum, m) => sum + (Number(m.proteinG) || 0), 0);

export const selectCarbsLoggedG = (journal: DailyJournalAggregate): number =>
  journal.meals.reduce((sum, m) => sum + (Number(m.carbsG) || 0), 0);

export const selectFatsLoggedG = (journal: DailyJournalAggregate): number =>
  journal.meals.reduce((sum, m) => sum + (Number(m.fatsG) || 0), 0);

export const selectActiveCaloriesBurned = (journal: DailyJournalAggregate): number =>
  journal.completedWorkouts.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);

export const selectEffectiveTDEE = (
  profile: UnifiedAthleteProfile,
  journal: DailyJournalAggregate
): number => {
  const baseTdee = profile.targets?.tdee || 2400;
  return baseTdee + selectActiveCaloriesBurned(journal);
};

export const selectEffectiveTargetCalories = (
  profile: UnifiedAthleteProfile,
  journal: DailyJournalAggregate
): number => {
  const baseTarget = profile.targets?.targetCalories || 2200;
  return baseTarget + selectActiveCaloriesBurned(journal);
};

export const selectRemainingCalories = (
  profile: UnifiedAthleteProfile,
  journal: DailyJournalAggregate
): number => {
  const effectiveTarget = selectEffectiveTargetCalories(profile, journal);
  const logged = selectCaloriesLogged(journal);
  return Math.max(0, effectiveTarget - logged);
};

export const selectRemainingProteinG = (
  profile: UnifiedAthleteProfile,
  journal: DailyJournalAggregate
): number => {
  const targetProtein = profile.targets?.targetProteinG || 160;
  const logged = selectProteinLoggedG(journal);
  return Math.max(0, targetProtein - logged);
};

export const selectCompletedMusclesToday = (journal: DailyJournalAggregate): string[] => {
  const set = new Set<string>();
  journal.completedWorkouts.forEach(w => {
    (w.trainedMuscles || []).forEach(m => set.add(m));
  });
  return Array.from(set);
};

