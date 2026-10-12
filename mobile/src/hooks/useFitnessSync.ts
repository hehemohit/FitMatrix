import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useTrainerStore } from '../store/useTrainerStore';

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

  useEffect(() => {
    // 1. Initial sync on mount
    syncTodayNutrition();
    syncHealth();

    // 2. Sync whenever app comes back from background
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncTodayNutrition();
        syncHealth();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncTodayNutrition, syncHealth]);
};
