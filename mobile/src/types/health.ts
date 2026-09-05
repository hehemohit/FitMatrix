/**
 * FitMatrix Health Types
 * Normalized schema for Android Health Connect data pipeline.
 * Matches the FitMatrixHealthMetrics JSON spec in the backend.
 */

export interface FitMatrixHealthMetrics {
  userId: string;
  timestamp: string; // ISO 8601
  metrics: {
    steps: number;
    activeCaloriesBurned: number;
    restingHeartRateBpm: number;
    sleepDurationHours: number;
  };
}

export type HealthConnectPermissionStatus =
  | 'available'
  | 'unavailable'
  | 'needs_permission'
  | 'checking';
