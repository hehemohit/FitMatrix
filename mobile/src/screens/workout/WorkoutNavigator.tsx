import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SwipeableScreenPager } from '../../navigation/SwipeableScreenPager';
import { WorkoutTabBar, WorkoutTabKey } from '../../components/workout/WorkoutTabBar';
import { WorkoutHomeScreen } from './WorkoutHomeScreen';
import { WorkoutPlanScreen } from './WorkoutPlanScreen';
import { WorkoutStatsScreen } from './WorkoutStatsScreen';
import { WorkoutExercisesScreen } from './WorkoutExercisesScreen';
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

const PAGE_TABS: WorkoutTabKey[] = ['home', 'plan', 'stats', 'exercises'];

export const WorkoutNavigator: React.FC<WorkoutNavigatorProps> = ({
  onStartWorkout,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const { isActive, minimizeWorkout } = useWorkoutSessionStore();
  const { exercises: libraryExercises } = useExerciseLibraryStore();
  const { workoutPlan } = useTrainerStore();

  const handleStartTodayRoutine = () => {
    if (isActive) {
      minimizeWorkout(false);
      return;
    }

    const defaultName = workoutPlan?.days?.[0]?.targetMuscleGroups?.[0]
      ? `${workoutPlan.days[0].targetMuscleGroups[0]} Day`
      : 'Push Day';

    const defaultExercises = libraryExercises.slice(0, 6);
    onStartWorkout(defaultName, defaultExercises);
  };

  const screens = useMemo(
    () => [
      <WorkoutHomeScreen
        key="workout-home-page"
        onStartTodayWorkout={handleStartTodayRoutine}
        onOpenSettings={() => {}}
        onCheckIn={() => {}}
      />,
      <WorkoutPlanScreen
        key="workout-plan-page"
        onSelectRoutine={routineName => {
          const ex = libraryExercises.slice(0, 5);
          onStartWorkout(routineName, ex);
        }}
      />,
      <WorkoutStatsScreen key="workout-stats-page" />,
      <WorkoutExercisesScreen
        key="workout-exercises-page"
        onSelectExercise={ex => {
          onStartWorkout(ex.name, [ex]);
        }}
      />,
    ],
    [libraryExercises, workoutPlan, isActive]
  );

  const handleTabPress = (tab: WorkoutTabKey) => {
    if (tab === 'start') {
      if (isActive) {
        // Open active workout session
        minimizeWorkout(false);
      } else {
        // Start today's workout directly
        handleStartTodayRoutine();
      }
      return;
    }

    const targetIdx = PAGE_TABS.indexOf(tab);
    if (targetIdx !== -1) {
      setCurrentPageIndex(targetIdx);
    }
  };

  const activeTabKey = PAGE_TABS[currentPageIndex] || 'home';

  return (
    <View style={styles.container}>
      {/* WhatsApp-Style Horizontal Gesture Pager across the 4 screens */}
      <SwipeableScreenPager
        screens={screens}
        currentIndex={currentPageIndex}
        onIndexChange={setCurrentPageIndex}
      />

      {/* Synchronized Dedicated Workout Bottom Navigation Bar */}
      <WorkoutTabBar
        activeTab={activeTabKey}
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
});

export default WorkoutNavigator;
