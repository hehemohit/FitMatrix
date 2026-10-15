import React, { useState, useEffect } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FoodLogScreen } from '../screens/FoodLogScreen';
import { StrategyScreen } from '../screens/StrategyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SwipeableScreenPager } from './SwipeableScreenPager';
import { CustomTabBar } from './CustomTabBar';
import { QuickActionModal } from '../components/macrofactor/QuickActionModal';
import { MealEntryModal } from '../components/MealEntryModal';
import { WeighInModal } from '../components/macrofactor/WeighInModal';
import { ActiveWorkoutScreen } from '../screens/workout/ActiveWorkoutScreen';
import { WorkoutCompleteScreen } from '../screens/workout/WorkoutCompleteScreen';
import { WorkoutNavigator } from '../screens/workout/WorkoutNavigator';
import { WorkoutMiniDock } from '../components/workout/WorkoutMiniDock';
import { useTrainerStore } from '../store/useTrainerStore';
import { useWorkoutSessionStore, WorkoutSummaryData } from '../store/useWorkoutSessionStore';
import { useExerciseLibraryStore } from '../store/useExerciseLibraryStore';
import { useDashboardTabStore } from '../store/useDashboardTabStore';
import { colors } from '../theme/colors';

export const AppNavigator: React.FC = () => {
  const { logMeal, weighIn, userProfile } = useTrainerStore();
  const {
    isActive,
    isMinimized,
    isPaused,
    tickWorkoutTimer,
    startWorkout,
    minimizeWorkout,
  } = useWorkoutSessionStore();
  const { exercises: libraryExercises } = useExerciseLibraryStore();
  const { activeDashboard, setActiveDashboard } = useDashboardTabStore();

  const [activeTab, setActiveTab] = useState(0);
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [weighInModalVisible, setWeighInModalVisible] = useState(false);
  const [workoutDashboardVisible, setWorkoutDashboardVisible] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<WorkoutSummaryData | null>(null);

  // Global workout elapsed & rest ticker interval that survives screen minimization
  useEffect(() => {
    if (!isActive || isPaused) return;
    tickWorkoutTimer();
    const iv = setInterval(() => {
      tickWorkoutTimer();
    }, 1000);
    return () => clearInterval(iv);
  }, [isActive, isPaused, tickWorkoutTimer]);

  const handleSelectQuickAction = (action: 'meal' | 'weight' | 'workout') => {
    if (action === 'meal') {
      setMealModalVisible(true);
    } else if (action === 'weight') {
      setWeighInModalVisible(true);
    } else if (action === 'workout') {
      if (!isActive) {
        setActiveDashboard('workout');
        setActiveTab(0);
      } else {
        minimizeWorkout(false);
      }
    }
  };

  const screens = React.useMemo(
    () => [
      <DashboardScreen key="dashboard-screen" />,
      <FoodLogScreen key="foodlog-screen" />,
      <StrategyScreen key="strategy-screen" />,
      <ProfileScreen key="profile-screen" />,
    ],
    []
  );

  return (
    <View style={styles.container}>
      {/* Either Workout Universe (with its own dedicated 5-tab bar) or Nutrition Universe */}
      {activeDashboard === 'workout' ? (
        <WorkoutNavigator
          onStartWorkout={(name, initialExercises) => {
            startWorkout(name, initialExercises);
          }}
        />
      ) : (
        <>
          {/* WhatsApp-Style Horizontal Gesture Pager */}
          <SwipeableScreenPager
            screens={screens}
            currentIndex={activeTab}
            onIndexChange={setActiveTab}
          />

          {/* Synchronized Custom Bottom Tab Bar for Nutrition */}
          <CustomTabBar
            currentIndex={activeTab}
            onSelectIndex={setActiveTab}
            onFabPress={() => setQuickActionVisible(true)}
          />
        </>
      )}

      {/* Floating Minimized Workout Dock */}
      <WorkoutMiniDock />

      {/* Floating Center (+) Action Sheet */}
      <QuickActionModal
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        onSelectAction={handleSelectQuickAction}
      />

      {/* Quick Meal Entry Modal */}
      <MealEntryModal
        visible={mealModalVisible}
        onClose={() => setMealModalVisible(false)}
        onLog={logMeal}
      />

      {/* Daily Weigh-In Modal */}
      <WeighInModal
        visible={weighInModalVisible}
        onClose={() => setWeighInModalVisible(false)}
        onSave={weighIn}
        initialWeight={userProfile.weight_kg}
      />


      {/* Full-Screen Active Workout Modal */}
      <Modal
        visible={isActive && !isMinimized}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => minimizeWorkout(true)}
      >
        <ActiveWorkoutScreen
          onCompleteWorkout={summary => setCompletedSummary(summary)}
          onExitWorkout={() => minimizeWorkout(true)}
        />
      </Modal>

      {/* Workout Complete Summary Modal */}
      <Modal
        visible={!!completedSummary}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCompletedSummary(null)}
      >
        {completedSummary && (
          <WorkoutCompleteScreen
            summary={completedSummary}
            onDone={() => setCompletedSummary(null)}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appDark,
  },
});

