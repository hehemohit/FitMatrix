import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useWorkoutSessionStore, WorkoutSummaryData, SetType } from '../../store/useWorkoutSessionStore';
import { WorkoutHeaderBar } from '../../components/workout/WorkoutHeaderBar';
import { WorkoutExerciseChips } from '../../components/workout/WorkoutExerciseChips';
import { SetLoggingTable } from '../../components/workout/SetLoggingTable';
import { WorkoutRestTimerBar } from '../../components/workout/WorkoutRestTimerBar';
import { CustomWorkoutKeypad } from '../../components/workout/CustomWorkoutKeypad';
import { RestTimerSheet } from '../../components/workout/RestTimerSheet';
import { WorkoutOptionMenuModal } from '../../components/workout/WorkoutOptionMenuModal';
import { AddExerciseModal } from '../../components/workout/AddExerciseModal';
import { ExerciseInfoModal } from '../../components/workout/ExerciseInfoModal';
import { DiscomfortSwapModal } from '../../components/workout/DiscomfortSwapModal';
import { ExerciseRecord } from '../../utils/muscleTargetMapper';

interface ActiveWorkoutScreenProps {
  onCompleteWorkout: (summary: WorkoutSummaryData) => void;
  onExitWorkout: () => void;
}

export const ActiveWorkoutScreen: React.FC<ActiveWorkoutScreenProps> = ({
  onCompleteWorkout,
  onExitWorkout,
}) => {
  const insets = useSafeAreaInsets();

  const {
    isActive,
    isPaused,
    workoutName,
    elapsedSeconds,
    restTimerSeconds,
    isRestSheetOpen,
    exercises,
    activeExerciseIndex,
    activeSetIndex,
    activeFieldType,
    pauseWorkout,
    resumeWorkout,
    minimizeWorkout,
    renameWorkout,
    discardWorkout,
    finishWorkout,
    adjustRestTimer,
    startRestTimer,
    stopRestTimer,
    setRestSheetOpen,
    setActiveExerciseIndex,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    swapExerciseInWorkout,
    reorderExercise,
    updateExerciseNotes,
    addSet,
    removeSet,
    toggleSetComplete,
    markAllSetsDone,
    setSetType,
    updateSetWeight,
    updateSetReps,
    focusField,
    handleKeypadPress,
    handleKeypadBackspace,
    handleKeypadIncrement,
    handleKeypadNext,
  } = useWorkoutSessionStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [addExerciseVisible, setAddExerciseVisible] = useState(false);
  const [swapExerciseIdx, setSwapExerciseIdx] = useState<number | null>(null);
  const [infoModalExercise, setInfoModalExercise] = useState<ExerciseRecord | null>(null);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [exerciseActionMenuIdx, setExerciseActionMenuIdx] = useState<number | null>(null);
  const [discomfortModalIdx, setDiscomfortModalIdx] = useState<number | null>(null);

  // Aggregated set statistics
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const doneSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length,
    0
  );

  const activeExercise = exercises[activeExerciseIndex] || null;
  const currentSet = activeExercise?.sets[activeSetIndex] || null;
  const currentWeight = currentSet ? currentSet.weight : 0;

  const handleSelectAddOrSwap = (selected: ExerciseRecord) => {
    if (swapExerciseIdx !== null) {
      swapExerciseInWorkout(swapExerciseIdx, selected);
      setSwapExerciseIdx(null);
    } else {
      addExerciseToWorkout(selected);
    }
  };

  const handleConfirmDiscomfortSwap = (replacement: ExerciseRecord) => {
    if (discomfortModalIdx !== null) {
      swapExerciseInWorkout(discomfortModalIdx, replacement);
      setDiscomfortModalIdx(null);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout?',
      `You completed ${doneSets} of ${totalSets} planned sets. Ready to save?`,
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Finish & Save',
          style: 'default',
          onPress: () => {
            const summary = finishWorkout();
            onCompleteWorkout(summary);
          },
        },
      ]
    );
  };

  const handleDiscard = () => {
    discardWorkout();
    onExitWorkout();
  };

  const handleOpenRename = () => {
    setRenameText(workoutName);
    setRenameModalVisible(true);
  };

  const handleSaveRename = () => {
    if (renameText.trim()) {
      renameWorkout(renameText.trim());
    }
    setRenameModalVisible(false);
  };

  if (!isActive && exercises.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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

      {/* 1. Header Bar: Minimize chevron, elapsed clock, fraction, options, finish button & progress line */}
      <WorkoutHeaderBar
        workoutName={workoutName}
        elapsedSeconds={elapsedSeconds}
        doneSets={doneSets}
        totalSets={totalSets}
        onMinimize={() => minimizeWorkout(true)}
        onOpenMenu={() => setMenuVisible(true)}
        onFinish={handleFinish}
      />

      {/* 2. Horizontal Exercise Chips */}
      <WorkoutExerciseChips
        exercises={exercises}
        activeIndex={activeExerciseIndex}
        onSelectIndex={setActiveExerciseIndex}
      />

      {/* 3. Main Scrollable Routine Content */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={{
          paddingBottom: isKeypadOpen ? 320 : 130,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.map((ex, exIdx) => {
          const isSelectedEx = exIdx === activeExerciseIndex;
          const exDoneSets = ex.sets.filter(s => s.isCompleted).length;
          const allExDone = ex.sets.length > 0 && exDoneSets === ex.sets.length;

          return (
            <View
              key={ex.instanceId || `card_${exIdx}`}
              style={[
                styles.exerciseCard,
                isSelectedEx && styles.exerciseCardActive,
                allExDone && styles.exerciseCardDone,
              ]}
            >
              {/* Exercise Card Header */}
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  style={styles.cardHeaderLeft}
                  onPress={() => setActiveExerciseIndex(exIdx)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.exIndexBadge, isSelectedEx && styles.exIndexBadgeActive]}>
                    <Text style={[styles.exIndexText, isSelectedEx && styles.exIndexTextActive]}>
                      {exIdx + 1}
                    </Text>
                  </View>
                  <View style={styles.exTitleCol}>
                    <Text style={styles.exNameText} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exCategoryText}>
                      {ex.target || 'General'} · {ex.equipment || 'Standard'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardHeaderRight}>
                  {/* Info Icon Button */}
                  <TouchableOpacity
                    style={styles.cardActionIconBtn}
                    onPress={() =>
                      setInfoModalExercise({
                        id: ex.exerciseId,
                        name: ex.name,
                        category: ex.category,
                        target: ex.target,
                        secondary: ex.secondary || [],
                        equipment: ex.equipment,
                        image: ex.image,
                        gifUrl: ex.gifUrl,
                        instructions: [],
                      })
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Circle cx="12" cy="12" r="10" stroke="#9ca3af" strokeWidth="2" />
                      <Path d="M12 16V12M12 8H12.01" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                    </Svg>
                  </TouchableOpacity>

                  {/* ⚠️ Flag Discomfort / Biomechanical Auto-Regulation */}
                  <TouchableOpacity
                    style={styles.cardActionIconBtn}
                    onPress={() => setDiscomfortModalIdx(exIdx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 13 }}>⚠️</Text>
                  </TouchableOpacity>

                  {/* ⋯ Exercise Action Menu */}
                  <TouchableOpacity
                    style={styles.cardActionIconBtn}
                    onPress={() => setExerciseActionMenuIdx(exIdx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Circle cx="12" cy="5" r="1.75" fill="#9ca3af" />
                      <Circle cx="12" cy="12" r="1.75" fill="#9ca3af" />
                      <Circle cx="12" cy="19" r="1.75" fill="#9ca3af" />
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dynamic Exercise Notes Input */}
              <View style={styles.notesRow}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add form cues, seat height, or tempo..."
                  placeholderTextColor="#4b5563"
                  value={ex.notes || ''}
                  onChangeText={val => updateExerciseNotes(exIdx, val)}
                  returnKeyType="done"
                />
              </View>

              {/* Zero-Token Local Progressive Overload Suggestion Chip */}
              {(() => {
                const targetSet = ex.sets[activeSetIndex] || ex.sets[0];
                const prevW = targetSet?.previousWeight || (ex.sets[0]?.weight > 0 ? ex.sets[0].weight : 135);
                const targetW = prevW + 5;
                const targetR = targetSet?.previousReps || 8;
                const targetE1rm = Math.round(targetW * (1 + targetR / 30));

                return (
                  <TouchableOpacity
                    style={styles.overloadChip}
                    onPress={() => {
                      updateSetWeight(exIdx, isSelectedEx ? activeSetIndex : 0, targetW);
                      updateSetReps(exIdx, isSelectedEx ? activeSetIndex : 0, targetR);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.overloadChipText}>
                      ⚡ <Text style={styles.overloadHighlight}>Overload Target:</Text> {targetW} lb × {targetR} reps · E1RM: {targetE1rm} lb (Tap to apply)
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Sets Logging Table */}
              <SetLoggingTable
                sets={ex.sets}
                activeSetIndex={isSelectedEx ? activeSetIndex : -1}
                activeFieldType={activeFieldType}
                unit="Lb"
                onFocusField={(sIdx, field) => {
                  focusField(exIdx, sIdx, field);
                  setIsKeypadOpen(true);
                }}
                onToggleComplete={sIdx => toggleSetComplete(exIdx, sIdx)}
                onAddSet={() => addSet(exIdx, false)}
                onAddWarmup={() => addSet(exIdx, true)}
                onDeleteSet={sIdx => removeSet(exIdx, sIdx)}
                onSetTypeChange={(sIdx, type: SetType) => setSetType(exIdx, sIdx, type)}
                onIncrementField={(sIdx, field, delta) => {
                  if (field === 'weight') {
                    const cur = ex.sets[sIdx]?.weight || 0;
                    updateSetWeight(exIdx, sIdx, Math.max(0, cur + delta));
                  } else {
                    const cur = ex.sets[sIdx]?.reps || 0;
                    updateSetReps(exIdx, sIdx, Math.max(0, cur + delta));
                  }
                }}
              />
            </View>
          );
        })}

        {/* Append Exercise Button */}
        <TouchableOpacity
          style={styles.appendExerciseCard}
          onPress={() => {
            setSwapExerciseIdx(null);
            setAddExerciseVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.appendExercisePlus}>＋</Text>
          <Text style={styles.appendExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 4. Floating Rest Timer Pill */}
      <WorkoutRestTimerBar />

      {/* 5. Responsive Bottom Dock */}
      <View style={styles.bottomDockContainer}>
        {/* Complete Workout Button (elevates above keypad when active) */}
        <View
          style={[
            styles.completeBtnWrapper,
            !isKeypadOpen && { paddingBottom: Math.max(insets.bottom, 14) + 6 },
          ]}
        >
          <TouchableOpacity
            style={styles.completeWorkoutBtn}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
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

      {/* Modal: Exercise Card Actions (Swap, Reorder, Delete) */}
      <Modal
        visible={exerciseActionMenuIdx !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExerciseActionMenuIdx(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setExerciseActionMenuIdx(null)}
        >
          <View style={styles.actionSheetCard}>
            <Text style={styles.actionSheetTitle}>
              {exerciseActionMenuIdx !== null && exercises[exerciseActionMenuIdx]
                ? exercises[exerciseActionMenuIdx].name
                : 'Exercise Actions'}
            </Text>

            {/* Swap */}
            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                const targetIdx = exerciseActionMenuIdx;
                setExerciseActionMenuIdx(null);
                setSwapExerciseIdx(targetIdx);
                setAddExerciseVisible(true);
              }}
            >
              <Text style={styles.actionSheetIcon}>🔄</Text>
              <Text style={styles.actionSheetText}>Swap Exercise</Text>
            </TouchableOpacity>

            {/* Move Up */}
            {exerciseActionMenuIdx !== null && exerciseActionMenuIdx > 0 && (
              <TouchableOpacity
                style={styles.actionSheetRow}
                onPress={() => {
                  reorderExercise(exerciseActionMenuIdx, exerciseActionMenuIdx - 1);
                  setExerciseActionMenuIdx(null);
                }}
              >
                <Text style={styles.actionSheetIcon}>⬆️</Text>
                <Text style={styles.actionSheetText}>Move Up</Text>
              </TouchableOpacity>
            )}

            {/* Move Down */}
            {exerciseActionMenuIdx !== null &&
              exerciseActionMenuIdx < exercises.length - 1 && (
                <TouchableOpacity
                  style={styles.actionSheetRow}
                  onPress={() => {
                    reorderExercise(exerciseActionMenuIdx, exerciseActionMenuIdx + 1);
                    setExerciseActionMenuIdx(null);
                  }}
                >
                  <Text style={styles.actionSheetIcon}>⬇️</Text>
                  <Text style={styles.actionSheetText}>Move Down</Text>
                </TouchableOpacity>
              )}

            {/* Remove */}
            {exercises.length > 1 && exerciseActionMenuIdx !== null && (
              <TouchableOpacity
                style={[styles.actionSheetRow, styles.actionSheetRowDanger]}
                onPress={() => {
                  const targetIdx = exerciseActionMenuIdx;
                  setExerciseActionMenuIdx(null);
                  removeExerciseFromWorkout(targetIdx);
                }}
              >
                <Text style={styles.actionSheetIcon}>🗑️</Text>
                <Text style={styles.actionSheetTextDanger}>Remove Exercise</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Rename Workout */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenameModalVisible(false)}
        >
          <View style={styles.actionSheetCard}>
            <Text style={styles.actionSheetTitle}>Rename Workout</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="e.g. Chest & Triceps Blast"
              placeholderTextColor="#6b7280"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.renameActionsRow}>
              <TouchableOpacity
                style={styles.renameCancelBtn}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.renameSaveBtn}
                onPress={handleSaveRename}
              >
                <Text style={styles.renameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sheet: Full Rest Timer Duration Control */}
      <RestTimerSheet
        visible={isRestSheetOpen}
        onClose={() => setRestSheetOpen(false)}
        secondsRemaining={restTimerSeconds}
        onAdjustSeconds={adjustRestTimer}
        onStartNewTimer={startRestTimer}
        onStopTimer={stopRestTimer}
      />

      {/* Modal: Top-Level Workout Options */}
      <WorkoutOptionMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isPaused={isPaused}
        onTogglePause={isPaused ? resumeWorkout : pauseWorkout}
        onMinimize={() => minimizeWorkout(true)}
        onComplete={handleFinish}
        onDiscard={handleDiscard}
        onRename={handleOpenRename}
        onMarkAllDone={markAllSetsDone}
        onAddExercise={() => {
          setSwapExerciseIdx(null);
          setAddExerciseVisible(true);
        }}
      />

      {/* Modal: Exercise Library Browser (Add or Swap) */}
      <AddExerciseModal
        visible={addExerciseVisible}
        onClose={() => setAddExerciseVisible(false)}
        onSelectExercise={handleSelectAddOrSwap}
        title={swapExerciseIdx !== null ? 'Swap Movement' : 'Add Exercise'}
      />

      {/* Modal: Exercise Info & Demo */}
      <ExerciseInfoModal
        visible={!!infoModalExercise}
        onClose={() => setInfoModalExercise(null)}
        exercise={infoModalExercise}
      />

      {/* ⚠️ Biomechanical Auto-Regulation & Discomfort Swap Modal */}
      <DiscomfortSwapModal
        visible={discomfortModalIdx !== null}
        exerciseName={
          discomfortModalIdx !== null && exercises[discomfortModalIdx]
            ? exercises[discomfortModalIdx].name
            : ''
        }
        onClose={() => setDiscomfortModalIdx(null)}
        onConfirmSwap={handleConfirmDiscomfortSwap}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  exerciseCard: {
    backgroundColor: '#12141c',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1a1f2b',
    padding: 12,
    marginBottom: 12,
  },
  exerciseCardActive: {
    borderColor: '#22c55e44',
  },
  exerciseCardDone: {
    borderColor: '#15803d44',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  exIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#1a1f2b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exIndexBadgeActive: {
    backgroundColor: '#142c1d',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  exIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
  },
  exIndexTextActive: {
    color: '#22c55e',
  },
  exTitleCol: {
    flex: 1,
  },
  exNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  exCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesRow: {
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#161922',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#202636',
  },
  appendExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#242a3a',
    backgroundColor: '#0f1218',
    marginBottom: 16,
    gap: 8,
  },
  appendExercisePlus: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: '900',
  },
  appendExerciseText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
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
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCloseBtn: {
    backgroundColor: '#161922',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242a3a',
  },
  emptyCloseText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomDockContainer: {
    backgroundColor: '#0e1017',
    borderTopWidth: 1,
    borderTopColor: '#1a1f2b',
  },
  completeBtnWrapper: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  completeWorkoutBtn: {
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  completeWorkoutBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionSheetCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#161922',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242a3a',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#202636',
    gap: 12,
  },
  actionSheetRowDanger: {
    borderBottomWidth: 0,
  },
  actionSheetIcon: {
    fontSize: 18,
    width: 24,
  },
  actionSheetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  actionSheetTextDanger: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  renameInput: {
    backgroundColor: '#0f1118',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242a3a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 16,
  },
  renameActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  renameCancelText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
  renameSaveBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  renameSaveText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
  },
  overloadChip: {
    backgroundColor: '#111e17',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e402c',
    alignSelf: 'flex-start',
  },
  overloadChipText: {
    fontSize: 11,
    color: '#86efac',
    fontWeight: '600',
  },
  overloadHighlight: {
    color: '#4ade80',
    fontWeight: '800',
  },
});

export default ActiveWorkoutScreen;
