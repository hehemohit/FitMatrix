import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { CompletedWorkoutRecord } from '../../store/useWorkoutHistoryStore';

interface WorkoutDetailModalProps {
  visible: boolean;
  workout: CompletedWorkoutRecord | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  visible,
  workout,
  onClose,
  onDelete,
}) => {
  const topInset = useSafeTopInset(12);

  if (!workout) return null;

  const dateObj = workout.completedAt ? new Date(workout.completedAt) : new Date();
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const durationMin = Math.round((workout.durationSeconds || 0) / 60);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workout.routineName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {dateFormatted} · {timeFormatted}
            </Text>
          </View>
          {onDelete && (
            <TouchableOpacity
              onPress={() => {
                onDelete(workout.id);
                onClose();
              }}
              style={styles.deleteBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Key Metrics Banner */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{durationMin}m</Text>
              <Text style={styles.metricLbl}>Duration</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{workout.totalVolumeLb.toLocaleString()}</Text>
              <Text style={styles.metricLbl}>Volume (lb)</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{workout.totalSets}</Text>
              <Text style={styles.metricLbl}>Total Sets</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{workout.totalReps}</Text>
              <Text style={styles.metricLbl}>Total Reps</Text>
            </View>
          </View>

          {/* Notes if present */}
          {workout.notes && workout.notes.trim().length > 0 && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{workout.notes}</Text>
            </View>
          )}

          {/* Trained Muscles Badges */}
          {workout.trainedMuscles && workout.trainedMuscles.length > 0 && (
            <View style={styles.musclesSection}>
              <Text style={styles.sectionTitle}>Target Muscles</Text>
              <View style={styles.chipsRow}>
                {workout.trainedMuscles.map((muscle, idx) => (
                  <View key={`m-${idx}`} style={styles.muscleChip}>
                    <Text style={styles.muscleChipText}>
                      {muscle.charAt(0).toUpperCase() + muscle.slice(1).replace(/-/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Exercises Breakdown */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Exercises ({workout.exercises.length})</Text>

          {workout.exercises.map((ex, exIdx) => {
            const completedSets = ex.sets.filter(s => s.isCompleted);
            const totalExVolume = ex.sets
              .filter(s => s.isCompleted)
              .reduce((acc, s) => acc + s.weight * s.reps, 0);

            return (
              <View key={`ex-${exIdx}`} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseSub}>
                      {completedSets.length} sets completed · {totalExVolume.toLocaleString()} lb
                    </Text>
                  </View>
                  {ex.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{ex.category}</Text>
                    </View>
                  )}
                </View>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 36 }]}>SET</Text>
                  <Text style={[styles.th, { flex: 1 }]}>WEIGHT</Text>
                  <Text style={[styles.th, { flex: 1 }]}>REPS</Text>
                  <Text style={[styles.th, { width: 44, textAlign: 'center' }]}>RIR</Text>
                  <Text style={[styles.th, { width: 32, textAlign: 'center' }]}>✓</Text>
                </View>

                {/* Sets Rows */}
                {ex.sets.map((s, sIdx) => {
                  const setBadge =
                    s.type === 'warmup'
                      ? 'W'
                      : s.type === 'drop'
                      ? 'D'
                      : s.type === 'failure'
                      ? 'F'
                      : String(s.setNumber);

                  return (
                    <View
                      key={`s-${sIdx}`}
                      style={[
                        styles.tableRow,
                        s.isCompleted && styles.tableRowCompleted,
                        sIdx === ex.sets.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={styles.setNumberPill}>
                        <Text style={styles.setNumberText}>{setBadge}</Text>
                      </View>
                      <Text style={[styles.td, { flex: 1 }]}>{s.weight} lb</Text>
                      <Text style={[styles.td, { flex: 1 }]}>{s.reps}</Text>
                      <Text style={[styles.td, { width: 44, textAlign: 'center', color: '#9ca3af' }]}>
                        {s.rir != null ? `${s.rir}` : '–'}
                      </Text>
                      <View style={[styles.checkCircle, s.isCompleted && styles.checkCircleActive]}>
                        <Text style={styles.checkText}>{s.isCompleted ? '✓' : ''}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#12151c',
    borderBottomWidth: 1,
    borderBottomColor: '#222736',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c202d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#161922',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#242838',
    marginBottom: 16,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  metricLbl: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#242838',
  },
  notesBox: {
    backgroundColor: '#161922',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242838',
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#e5e7eb',
    lineHeight: 18,
  },
  musclesSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    backgroundColor: '#1c202d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3044',
  },
  muscleChipText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242838',
    marginBottom: 12,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  exerciseSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: '#242838',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222736',
    alignItems: 'center',
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1c202d',
    alignItems: 'center',
  },
  tableRowCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  setNumberPill: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#242838',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setNumberText: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '700',
  },
  td: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
});
