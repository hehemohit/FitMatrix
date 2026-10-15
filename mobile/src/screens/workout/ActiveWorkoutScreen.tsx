import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { colors } from '../../theme/colors';
import { useWorkoutSessionStore } from '../../store/useWorkoutSessionStore';
import { DualWorkoutHeader } from '../../components/workout/DualWorkoutHeader';
import { ExerciseCarousel } from '../../components/workout/ExerciseCarousel';
import { ExerciseActionBar } from '../../components/workout/ExerciseActionBar';
import { SetLoggingTable } from '../../components/workout/SetLoggingTable';
import { CustomWorkoutKeypad } from '../../components/workout/CustomWorkoutKeypad';
import { RestTimerSheet } from '../../components/workout/RestTimerSheet';
import { WorkoutOptionMenuModal } from '../../components/workout/WorkoutOptionMenuModal';
import { AddExerciseModal } from '../../components/workout/AddExerciseModal';
import { ExerciseInfoModal } from '../../components/workout/ExerciseInfoModal';
import { ExerciseRecord } from '../../utils/muscleTargetMapper';

interface ActiveWorkoutScreenProps {
  onCompleteWorkout: (summary: any) => void;
  onExitWorkout: () => void;
}

export const ActiveWorkoutScreen: React.FC<ActiveWorkoutScreenProps> = ({
  onCompleteWorkout,
  onExitWorkout,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = useSafeTopInset(8);

  const {
    isActive,
    isPaused,
    elapsedSeconds,
    restTimerSeconds,
    restTimerActive,
    isRestSheetOpen,
    exercises,
    activeExerciseIndex,
    activeSetIndex,
    activeFieldType,
    tickWorkoutTimer,
    pauseWorkout,
    resumeWorkout,
    minimizeWorkout,
    discardWorkout,
    finishWorkout,
    adjustRestTimer,
    startRestTimer,
    stopRestTimer,
    setRestSheetOpen,
    setActiveExerciseIndex,
    addExerciseToWorkout,
    swapExerciseInWorkout,
    addSet,
    toggleSetComplete,
    focusField,
    handleKeypadPress,
    handleKeypadBackspace,
    handleKeypadIncrement,
    handleKeypadNext,
  } = useWorkoutSessionStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [addExerciseVisible, setAddExerciseVisible] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  // Background timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      tickWorkoutTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickWorkoutTimer]);

  const activeExercise = exercises[activeExerciseIndex] || null;
  const currentSet = activeExercise?.sets[activeSetIndex] || null;
  const currentWeight = currentSet ? currentSet.weight : 0;

  // Selected exercise as ExerciseRecord for Info Modal
  const activeExerciseRecord: ExerciseRecord | null = useMemo(() => {
    if (!activeExercise) return null;
    return {
      id: activeExercise.exerciseId,
      name: activeExercise.name,
      category: activeExercise.category,
      target: activeExercise.target,
      secondary: activeExercise.secondary || [],
      equipment: activeExercise.equipment,
      image: activeExercise.image,
      gifUrl: activeExercise.gifUrl,
      instructions: [],
    };
  }, [activeExercise]);

  const handleSelectAddOrSwap = (selected: ExerciseRecord) => {
    if (swapMode) {
      swapExerciseInWorkout(activeExerciseIndex, selected);
      setSwapMode(false);
    } else {
      addExerciseToWorkout(selected);
    }
  };

  const handleComplete = () => {
    const summary = finishWorkout();
    onCompleteWorkout(summary);
  };

  const handleDiscard = () => {
    discardWorkout();
    onExitWorkout();
  };

  if (!isActive && exercises.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Active Workout</Text>
          <Text style={styles.emptySub}>Start a session from the Plans Studio or Workout tab.</Text>
          <TouchableOpacity style={styles.emptyCloseBtn} onPress={onExitWorkout}>
            <Text style={styles.emptyCloseText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. Dual Timers Header (has its own safe top inset) */}
      <DualWorkoutHeader
        elapsedSeconds={elapsedSeconds}
        restSeconds={restTimerSeconds}
        restTimerActive={restTimerActive}
        isPaused={isPaused}
        onOpenMenu={() => setMenuVisible(true)}
        onOpenRestSheet={() => setRestSheetOpen(true)}
      />

      {/* 2. Horizontal Exercise Carousel */}
      <ExerciseCarousel
        exercises={exercises}
        activeIndex={activeExerciseIndex}
        onSelectIndex={setActiveExerciseIndex}
        onAddExercise={() => {
          setSwapMode(false);
          setAddExerciseVisible(true);
        }}
      />

      {/* Main Body */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={{
          paddingBottom: isKeypadOpen ? 300 : 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {activeExercise && (
          <View style={styles.exerciseHeader}>
            <View style={styles.nameRow}>
              <Text style={styles.exerciseTitle}>{activeExercise.name}</Text>
              <View style={styles.oneRmBadge}>
                <Text style={styles.oneRmText}>
                  {Math.round(currentWeight * (1 + 0.0333 * (currentSet?.reps || 8)))} Lb
                </Text>
                <Text style={styles.oneRmSub}>Est 1RM</Text>
              </View>
            </View>

            <Text style={styles.setCountSub}>
              Set {Math.min(activeSetIndex + 1, activeExercise.sets.length)} of {activeExercise.sets.length}
            </Text>

            {/* 3. Action Bar */}
            <ExerciseActionBar
              onOpenInfo={() => setInfoModalVisible(true)}
              onOpenWarmUp={() => addSet(activeExerciseIndex)}
              onOpenTargets={() => {}}
              onOpenSwap={() => {
                setSwapMode(true);
                setAddExerciseVisible(true);
              }}
              onOpenSmartProgression={() => {}}
            />

            {/* 4. Interactive Set Logging Table */}
            <SetLoggingTable
              sets={activeExercise.sets}
              activeSetIndex={activeSetIndex}
              activeFieldType={activeFieldType}
              onFocusField={(sIdx, field) => {
                focusField(activeExerciseIndex, sIdx, field);
                setIsKeypadOpen(true);
              }}
              onToggleComplete={sIdx => toggleSetComplete(activeExerciseIndex, sIdx)}
              onAddSet={() => addSet(activeExerciseIndex)}
            />
          </View>
        )}
      </ScrollView>

      {/* 5. Responsive Bottom Dock: Complete Session Button + On-Demand Keypad */}
      <View style={styles.bottomDockContainer}>
        {/* Complete Session Button (sits bottom-middle when closed, elevates on top of keypad when open) */}
        <View style={[
          styles.completeBtnWrapper,
          !isKeypadOpen && { paddingBottom: Math.max(insets.bottom, 14) + 6 }
        ]}>
          <TouchableOpacity
            style={styles.completeWorkoutBtn}
            onPress={handleComplete}
            activeOpacity={0.85}
          >
            <Text style={styles.completeWorkoutBtnIcon}>🏁</Text>
            <Text style={styles.completeWorkoutBtnText}>Complete Workout</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Numeric Keypad & Plate Math (opens on-demand) */}
        {isKeypadOpen && (
          <CustomWorkoutKeypad
            currentWeight={currentWeight}
            activeFieldType={activeFieldType}
            onKeyPress={handleKeypadPress}
            onBackspace={handleKeypadBackspace}
            onIncrement={handleKeypadIncrement}
            onNext={handleKeypadNext}
            onClose={() => setIsKeypadOpen(false)}
          />
        )}
      </View>

      {/* Modals */}
      <RestTimerSheet
        visible={isRestSheetOpen}
        onClose={() => setRestSheetOpen(false)}
        secondsRemaining={restTimerSeconds}
        onAdjustSeconds={adjustRestTimer}
        onStartNewTimer={startRestTimer}
        onStopTimer={stopRestTimer}
      />

      <WorkoutOptionMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isPaused={isPaused}
        onTogglePause={isPaused ? resumeWorkout : pauseWorkout}
        onMinimize={() => minimizeWorkout(true)}
        onComplete={handleComplete}
        onDiscard={handleDiscard}
      />

      <AddExerciseModal
        visible={addExerciseVisible}
        onClose={() => setAddExerciseVisible(false)}
        onSelectExercise={handleSelectAddOrSwap}
        title={swapMode ? 'Swap Movement' : 'Add Exercise'}
      />

      <ExerciseInfoModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
        exercise={activeExerciseRecord}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121418',
  },
  scrollBody: {
    flex: 1,
  },
  exerciseHeader: {
    paddingTop: 14,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  exerciseTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginRight: 10,
  },
  oneRmBadge: {
    backgroundColor: '#162338',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b88eb66',
    alignItems: 'center',
  },
  oneRmText: {
    color: '#7ba9f5',
    fontWeight: '800',
    fontSize: 12,
  },
  oneRmSub: {
    color: '#4b88eb',
    fontSize: 9,
    fontWeight: '700',
  },
  setCountSub: {
    fontSize: 13,
    color: '#7e8695',
    fontWeight: '600',
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#767d8a',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCloseBtn: {
    backgroundColor: '#222733',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#343c4e',
  },
  emptyCloseText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomDockContainer: {
    backgroundColor: '#121418',
    borderTopWidth: 1,
    borderTopColor: '#1d212b',
  },
  completeBtnWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: 'center',
  },
  completeWorkoutBtn: {
    width: '100%',
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  completeWorkoutBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  completeWorkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
