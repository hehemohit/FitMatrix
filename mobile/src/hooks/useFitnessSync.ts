import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useTrainerStore } from '../store/useTrainerStore';
import { useUnifiedAthleteStore } from '../store/useUnifiedAthleteStore';

/**
 * useFitnessSync — React Native Lifecycle Synchronization
 *
 * Automatically keeps the user's daily fitness data and 28-day habits
 * synchronized when the app mounts and whenever the user returns to the
 * foreground (e.g. the next morning or after switching apps).
 */
export const useFitnessSync = (): void => {
  const syncTodayNutrition = useTrainerStore((s) => s.syncTodayNutrition);
  const syncHealth = useTrainerStore((s) => s.syncHealth);
  const syncDailyBriefing = useTrainerStore((s) => s.syncDailyBriefing);

  useEffect(() => {
    // 1. Initial sync on mount
    useUnifiedAthleteStore.getState().checkAndRollCalendarDay();
    syncTodayNutrition();
    syncHealth();
    syncDailyBriefing();

    // 2. Sync whenever app comes back from background
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        useUnifiedAthleteStore.getState().checkAndRollCalendarDay();
        syncTodayNutrition();
        syncHealth();
        syncDailyBriefing();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncTodayNutrition, syncHealth, syncDailyBriefing]);
};
