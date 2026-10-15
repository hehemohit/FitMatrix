import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
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
    elapsedSeconds,
    exercises,
    activeExerciseIndex,
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

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

  const currentExercise = exercises[activeExerciseIndex];

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

      {/* Floating Minimized Workout Banner */}
      {isActive && isMinimized && (
        <TouchableOpacity
          style={styles.minimizedBanner}
          onPress={() => minimizeWorkout(false)}
          activeOpacity={0.85}
        >
          <View style={styles.miniLeft}>
            <View style={styles.miniDot} />
            <Text style={styles.miniTimer}>{formatElapsed(elapsedSeconds)}</Text>
            <Text style={styles.miniExercise} numberOfLines={1}>
              {currentExercise ? currentExercise.name : 'Workout in progress'}
            </Text>
          </View>
          <Text style={styles.miniResumeText}>Resume ➔</Text>
        </TouchableOpacity>
      )}

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
  minimizedBanner: {
    position: 'absolute',
    bottom: 78,
    left: 12,
    right: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 25,
    zIndex: 999,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  miniLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4b88eb',
    marginRight: 8,
  },
  miniTimer: {
    color: '#7ba9f5',
    fontWeight: '800',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginRight: 10,
  },
  miniExercise: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  miniResumeText: {
    color: '#4b88eb',
    fontWeight: '800',
    fontSize: 12,
  },
});

