import {
  initialize,
  requestPermission,
  readRecords,
  aggregateRecord,
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
  sleepMinutes: 0,
  activeCaloriesBurned: 0,
  restingHeartRateBpm: 0,
  workouts: [],
};

const REQUIRED_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
] as const;

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

    // Check which permissions are currently granted
    let granted = await getGrantedPermissions();

    // If ANY required permission is missing (e.g. SleepSession), request it
    const missingPermissions = REQUIRED_PERMISSIONS.filter(
      req => !granted.some(g => g.recordType === req.recordType && g.accessType === req.accessType)
    );

    if (missingPermissions.length > 0) {
      try {
        await requestPermission([...REQUIRED_PERMISSIONS]);
        granted = await getGrantedPermissions();
      } catch (permError) {
        console.warn('Permission request deferred or dismissed:', permError);
      }
    }

    const hasSteps = granted.some(p => p.recordType === 'Steps');
    const hasSleep = granted.some(p => p.recordType === 'SleepSession');
    const hasExercise = granted.some(p => p.recordType === 'ExerciseSession');
    const hasCalories = granted.some(p => p.recordType === 'ActiveCaloriesBurned');
    const hasHeartRate = granted.some(p => p.recordType === 'HeartRate');

    const now = new Date();
    // Midnight of current local calendar day — matches Google Fit / phone dashboard "Today"
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeToday = startOfToday.toISOString();
    const endTime = now.toISOString();

    // 48h and 7d windows for Sleep to reliably capture the latest night's sleep
    const startTimeSleep48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const startTimeSleep7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startTimeHR = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    let steps = 0;
    let sleepMinutes = 0;
    let activeCaloriesBurned = 0;
    let restingHeartRateBpm = 0;
    const workouts: HealthSnapshot['workouts'] = [];

    // ── Steps: prefer native deduplicated aggregate for Today ──────────────────
    if (hasSteps) {
      try {
        const agg = await aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter: { operator: 'between', startTime: startTimeToday, endTime },
        });
        if (agg && typeof agg.COUNT_TOTAL === 'number') {
          steps = agg.COUNT_TOTAL;
        } else {
          throw new Error('No COUNT_TOTAL in aggregate');
        }
      } catch (aggErr) {
        console.warn('aggregateRecord for Steps failed, using readRecords from start of today:', aggErr);
        const stepRecords = await readRecords('Steps', {
          timeRangeFilter: { operator: 'between', startTime: startTimeToday, endTime },
        });
        steps = stepRecords.records.reduce((acc, curr) => acc + (curr.count || 0), 0);
      }
    }

    // ── Sleep: read most recent sleep session ─────────────────────────────────
    if (hasSleep) {
      // 1. First attempt aggregateRecord across the last 48h
      try {
        const agg = await aggregateRecord({
          recordType: 'SleepSession',
          timeRangeFilter: { operator: 'between', startTime: startTimeSleep48h, endTime },
        });
        if (agg && typeof agg.SLEEP_DURATION_TOTAL === 'number' && agg.SLEEP_DURATION_TOTAL > 0) {
          sleepMinutes = Math.round(agg.SLEEP_DURATION_TOTAL / 60);
        }
      } catch (aggErr) {
        console.warn('SleepSession aggregateRecord failed:', aggErr);
      }

      // 2. If aggregate returned 0 or failed, read individual records (looking back up to 7 days)
      if (sleepMinutes === 0) {
        try {
          const sleepRecords = await readRecords('SleepSession', {
            timeRangeFilter: { operator: 'between', startTime: startTimeSleep7d, endTime },
            ascendingOrder: false,
          });
          if (sleepRecords.records.length > 0) {
            // Sort to find the latest completed sleep session
            const sorted = [...sleepRecords.records].sort(
              (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
            );
            const latest = sorted[0];
            const latestEnd = new Date(latest.endTime).getTime();

            // Aggregate sessions that occurred in the same night window (within 14h of latest session end)
            const sameNight = sorted.filter(
              s => Math.abs(new Date(s.endTime).getTime() - latestEnd) < 14 * 60 * 60 * 1000
            );
            sleepMinutes = sameNight.reduce((acc, curr) => {
              const diffMs = new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime();
              return acc + Math.round(diffMs / 60000);
            }, 0);
          }
        } catch (sleepErr) {
          console.warn('SleepSession readRecords failed:', sleepErr);
        }
      }
    }

    // ── Exercises logged today ────────────────────────────────────────────────
    if (hasExercise) {
      try {
        const exerciseRecords = await readRecords('ExerciseSession', {
          timeRangeFilter: { operator: 'between', startTime: startTimeToday, endTime },
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
      } catch (exErr) {
        console.warn('ExerciseSession read failed:', exErr);
      }
    }

    // ── Active Calories burned today ──────────────────────────────────────────
    if (hasCalories) {
      try {
        const calAgg = await aggregateRecord({
          recordType: 'ActiveCaloriesBurned',
          timeRangeFilter: { operator: 'between', startTime: startTimeToday, endTime },
        });
        if (calAgg && calAgg.ACTIVE_CALORIES_TOTAL && typeof calAgg.ACTIVE_CALORIES_TOTAL.inKilocalories === 'number') {
          activeCaloriesBurned = Math.round(calAgg.ACTIVE_CALORIES_TOTAL.inKilocalories);
        } else {
          throw new Error('No ACTIVE_CALORIES_TOTAL in aggregate');
        }
      } catch (err) {
        try {
          const calRecords = await readRecords('ActiveCaloriesBurned', {
            timeRangeFilter: { operator: 'between', startTime: startTimeToday, endTime },
          });
          activeCaloriesBurned = calRecords.records.reduce(
            (acc, curr) => acc + (curr.energy?.inKilocalories ?? 0),
            0
          );
          activeCaloriesBurned = Math.round(activeCaloriesBurned);
        } catch (readErr) {
          console.warn('ActiveCaloriesBurned read failed:', readErr);
        }
      }
    }

    // ── Resting Heart Rate (lowest 10th percentile over last 24h) ──────────────
    if (hasHeartRate) {
      try {
        const hrRecords = await readRecords('HeartRate', {
          timeRangeFilter: { operator: 'between', startTime: startTimeHR, endTime },
        });
        const allSamples = hrRecords.records.flatMap(r => r.samples ?? []);
        if (allSamples.length > 0) {
          const validBpm = allSamples
            .map(s => s.beatsPerMinute)
            .filter((bpm): bpm is number => typeof bpm === 'number' && bpm > 35 && bpm < 220)
            .sort((a, b) => a - b);

          if (validBpm.length > 0) {
            const p10Index = Math.floor(validBpm.length * 0.1);
            restingHeartRateBpm = Math.round(validBpm[p10Index]);
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