import React from 'react';
import { WorkoutNavigator } from './WorkoutNavigator';
import { ExerciseRecord } from '../../utils/muscleTargetMapper';

interface WorkoutDashboardScreenProps {
  onClose?: () => void;
  onStartWorkout: (
    name: string,
    exercises: (ExerciseRecord & { targetSets?: number; targetReps?: string | number })[]
  ) => void;
}

export const WorkoutDashboardScreen: React.FC<WorkoutDashboardScreenProps> = ({
  onStartWorkout,
}) => {
  return <WorkoutNavigator onStartWorkout={onStartWorkout} />;
};

export default WorkoutDashboardScreen;
