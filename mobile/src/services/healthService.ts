import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

export interface HealthSnapshot {
  steps: number;
  sleepMinutes: number;
  workouts: Array<{
    type: string;
    duration_min: number;
  }>;
}

export const syncHealthConnectData = async (): Promise<HealthSnapshot> => {
  const fallback: HealthSnapshot = { steps: 0, sleepMinutes: 420, workouts: [] };

  try {
    const status = await getSdkStatus();
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      console.warn('Health Connect SDK is not available on this device:', status);
      return fallback;
    }

    const isInitialized = await initialize();
    if (!isInitialized) {
      return fallback;
    }

    // Check permissions first instead of forcing prompt on cold start
    let granted = await getGrantedPermissions();

    if (!granted || granted.length === 0) {
      try {
        await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'SleepSession' },
          { accessType: 'read', recordType: 'ExerciseSession' },
        ]);
        granted = await getGrantedPermissions();
      } catch (permError) {
        console.warn('Permission request deferred or dismissed:', permError);
        return fallback;
      }
    }

    const hasSteps = granted.some(p => p.recordType === 'Steps');
    const hasSleep = granted.some(p => p.recordType === 'SleepSession');
    const hasExercise = granted.some(p => p.recordType === 'ExerciseSession');

    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = now.toISOString();

    let steps = 0;
    let sleepMinutes = 420;
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

    return { steps, sleepMinutes, workouts };
  } catch (err) {
    console.error('Error in syncHealthConnectData:', err);
    return fallback;
  }
};