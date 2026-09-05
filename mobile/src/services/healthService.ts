import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { FitMatrixHealthMetrics } from '../types/health';

export interface HealthSnapshot {
  steps: number;
  sleepMinutes: number;
  activeCaloriesBurned: number;
  restingHeartRateBpm: number;
  workouts: Array<{
    type: string;
    duration_min: number;
  }>;
}

const DEFAULT_SNAPSHOT: HealthSnapshot = {
  steps: 0,
  sleepMinutes: 420,
  activeCaloriesBurned: 0,
  restingHeartRateBpm: 0,
  workouts: [],
};

export const syncHealthConnectData = async (): Promise<HealthSnapshot> => {
  try {
    const status = await getSdkStatus();
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      console.warn('Health Connect SDK is not available on this device:', status);
      return DEFAULT_SNAPSHOT;
    }

    const isInitialized = await initialize();
    if (!isInitialized) {
      return DEFAULT_SNAPSHOT;
    }

    // Check permissions first instead of forcing prompt on cold start
    let granted = await getGrantedPermissions();

    if (!granted || granted.length === 0) {
      try {
        await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'SleepSession' },
          { accessType: 'read', recordType: 'ExerciseSession' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'HeartRate' },
        ]);
        granted = await getGrantedPermissions();
      } catch (permError) {
        console.warn('Permission request deferred or dismissed:', permError);
        return DEFAULT_SNAPSHOT;
      }
    }

    const hasSteps = granted.some(p => p.recordType === 'Steps');
    const hasSleep = granted.some(p => p.recordType === 'SleepSession');
    const hasExercise = granted.some(p => p.recordType === 'ExerciseSession');
    const hasCalories = granted.some(p => p.recordType === 'ActiveCaloriesBurned');
    const hasHeartRate = granted.some(p => p.recordType === 'HeartRate');

    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = now.toISOString();

    let steps = 0;
    let sleepMinutes = 420;
    let activeCaloriesBurned = 0;
    let restingHeartRateBpm = 0;
    const workouts: HealthSnapshot['workouts'] = [];

    if (hasSteps) {
      const stepRecords = await readRecords('Steps', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      steps = stepRecords.records.reduce((acc, curr) => acc + curr.count, 0);
    }

    if (hasSleep) {
      const sleepRecords = await readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      if (sleepRecords.records.length > 0) {
        sleepMinutes = sleepRecords.records.reduce((acc, curr) => {
          const diffMs = new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime();
          return acc + Math.round(diffMs / 60000);
        }, 0);
      }
    }

    if (hasExercise) {
      const exerciseRecords = await readRecords('ExerciseSession', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      exerciseRecords.records.forEach(session => {
        const duration = Math.round(
          (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000
        );
        workouts.push({
          type: String(session.exerciseType),
          duration_min: duration,
        });
      });
    }

    if (hasCalories) {
      try {
        const calRecords = await readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: { operator: 'between', startTime, endTime },
        });
        activeCaloriesBurned = calRecords.records.reduce(
          (acc, curr) => acc + (curr.energy?.inKilocalories ?? 0),
          0
        );
        activeCaloriesBurned = Math.round(activeCaloriesBurned);
      } catch (err) {
        console.warn('ActiveCaloriesBurned read failed — degrading gracefully:', err);
      }
    }

    if (hasHeartRate) {
      try {
        const hrRecords = await readRecords('HeartRate', {
          timeRangeFilter: { operator: 'between', startTime, endTime },
        });
        const allSamples = hrRecords.records.flatMap(r => r.samples ?? []);
        if (allSamples.length > 0) {
          // Use the minimum BPM reading as a proxy for resting HR
          restingHeartRateBpm = Math.round(
            Math.min(...allSamples.map(s => s.beatsPerMinute ?? Infinity))
          );
          if (!isFinite(restingHeartRateBpm)) {
            restingHeartRateBpm = 0;
          }
        }
      } catch (err) {
        console.warn('HeartRate read failed — degrading gracefully:', err);
      }
    }

    return { steps, sleepMinutes, activeCaloriesBurned, restingHeartRateBpm, workouts };
  } catch (err) {
    console.error('Error in syncHealthConnectData:', err);
    return DEFAULT_SNAPSHOT;
  }
};

/**
 * Normalizes a raw HealthSnapshot into the FitMatrixHealthMetrics wire format
 * used by the backend API payload.
 */
export const toHealthMetrics = (
  userId: string,
  snapshot: HealthSnapshot
): FitMatrixHealthMetrics => ({
  userId,
  timestamp: new Date().toISOString(),
  metrics: {
    steps: snapshot.steps,
    activeCaloriesBurned: snapshot.activeCaloriesBurned,
    restingHeartRateBpm: snapshot.restingHeartRateBpm,
    sleepDurationHours: parseFloat((snapshot.sleepMinutes / 60).toFixed(1)),
  },
});