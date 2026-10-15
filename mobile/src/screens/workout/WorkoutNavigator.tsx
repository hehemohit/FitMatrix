import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { WorkoutTabBar, WorkoutTabKey } from '../../components/workout/WorkoutTabBar';
import { WorkoutHomeScreen } from './WorkoutHomeScreen';
import { WorkoutPlanScreen } from './WorkoutPlanScreen';
import { WorkoutStatsScreen } from './WorkoutStatsScreen';
import { WorkoutExercisesScreen } from './WorkoutExercisesScreen';
import { WorkoutPreviewModal } from '../../components/workout/WorkoutPreviewModal';
import { useWorkoutSessionStore } from '../../store/useWorkoutSessionStore';
import { useExerciseLibraryStore } from '../../store/useExerciseLibraryStore';
import { useTrainerStore } from '../../store/useTrainerStore';
import { ExerciseRecord } from '../../utils/muscleTargetMapper';

interface WorkoutNavigatorProps {
  onStartWorkout: (
    name: string,
    exercises: (ExerciseRecord & { targetSets?: number; targetReps?: string | number })[]
  ) => void;
}

export const WorkoutNavigator: React.FC<WorkoutNavigatorProps> = ({
  onStartWorkout,
}) => {
  const [activeTab, setActiveTab] = useState<WorkoutTabKey>('home');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<{
    name: string;
    exercises: ExerciseRecord[];
  } | null>(null);

  const { isActive, minimizeWorkout } = useWorkoutSessionStore();
  const { exercises: libraryExercises } = useExerciseLibraryStore();
  const { workoutPlan } = useTrainerStore();

  const handleStartTodayRoutine = () => {
    if (isActive) {
      minimizeWorkout(false);
      return;
    }

    // Default to Push Day or AI plan
    const defaultName = workoutPlan?.days?.[0]?.targetMuscleGroups?.[0]
      ? `${workoutPlan.days[0].targetMuscleGroups[0]} Day`
      : 'Push Day';

    const defaultExercises = libraryExercises.slice(0, 6);
    onStartWorkout(defaultName, defaultExercises);
  };

  const handleTabPress = (tab: WorkoutTabKey) => {
    if (tab === 'start') {
      if (isActive) {
        // Open current active session
        minimizeWorkout(false);
      } else {
        // Start today's workout directly
        handleStartTodayRoutine();
      }
      return;
    }
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      {/* Tab Screen Content */}
      <View style={styles.content}>
        {activeTab === 'home' && (
          <WorkoutHomeScreen
            onStartTodayWorkout={handleStartTodayRoutine}
            onOpenSettings={() => {}}
            onCheckIn={() => {}}
          />
        )}

        {activeTab === 'plan' && (
          <WorkoutPlanScreen
            onSelectRoutine={routineName => {
              const ex = libraryExercises.slice(0, 5);
              onStartWorkout(routineName, ex);
            }}
          />
        )}

        {activeTab === 'stats' && <WorkoutStatsScreen />}

        {activeTab === 'exercises' && (
          <WorkoutExercisesScreen
            onSelectExercise={ex => {
              // Quick start single exercise
              onStartWorkout(ex.name, [ex]);
            }}
            onAddToPlan={ex => {
              // Add to routine
            }}
          />
        )}
      </View>

      {/* Dedicated Workout Bottom Navigation Bar */}
      <WorkoutTabBar
        activeTab={activeTab}
        onSelectTab={handleTabPress}
        isWorkoutActive={isActive}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  content: {
    flex: 1,
  },
});

export default WorkoutNavigator;
