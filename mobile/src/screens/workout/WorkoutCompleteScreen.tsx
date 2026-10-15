import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { colors } from '../../theme/colors';
import { WorkoutSummaryData } from '../../store/useWorkoutSessionStore';
import { MuscleSkeletonMap } from '../../components/workout/MuscleSkeletonMap';
import { mapExerciseToMuscles, MuscleKey } from '../../utils/muscleTargetMapper';

interface WorkoutCompleteScreenProps {
  summary: WorkoutSummaryData;
  onDone: () => void;
}

export const WorkoutCompleteScreen: React.FC<WorkoutCompleteScreenProps> = ({
  summary,
  onDone,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = useSafeTopInset(10);

  // Aggregate trained muscles across all exercises
  const highlightedMuscles = useMemo(() => {
    const muscles = new Set<MuscleKey>();
    summary.exercises.forEach(ex => {
      const mapped = mapExerciseToMuscles(ex.target, ex.secondary);
      mapped.primary.forEach(m => muscles.add(m));
    });
    return Array.from(muscles);
  }, [summary.exercises]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  // Find the highest volume exercise as the headline PR
  const topExercise = summary.exercises[0] || null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <TouchableOpacity onPress={onDone} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Complete</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* 1. Responsive Front & Back Anatomical Muscle Skeleton */}
        <View style={styles.skeletonCard}>
          <MuscleSkeletonMap
            highlightedMuscles={highlightedMuscles}
            width={120}
            height={210}
            showLabels={true}
          />
        </View>

        {/* 2. Personal Records & Highlights Carousel */}
        <Text style={styles.sectionTitle}>Highlights</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prCarousel}>
          {topExercise && (
            <View style={styles.prCard}>
              <View style={styles.prHeader}>
                <Text style={styles.prTrophy}>🏆</Text>
                <View>
                  <Text style={styles.prScore}>Volume Record</Text>
                  <Text style={styles.prNew}>New Personal Best!</Text>
                </View>
              </View>
              <Text style={styles.prExerciseName} numberOfLines={1}>{topExercise.name}</Text>
              <Text style={styles.prCategory}>Session Highlight</Text>
            </View>
          )}

          <View style={styles.prCard}>
            <View style={styles.prHeader}>
              <Text style={styles.prTrophy}>⚡</Text>
              <View>
                <Text style={styles.prScore}>{summary.totalSets} Total Sets</Text>
                <Text style={styles.prNew}>Optimal Volume</Text>
              </View>
            </View>
            <Text style={styles.prExerciseName}>{summary.totalReps} Reps Completed</Text>
            <Text style={styles.prCategory}>Intensity Tracked</Text>
          </View>
        </ScrollView>

        {/* 3. Workout Details Section */}
        <Text style={styles.sectionTitle}>Workout Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏋️</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Total Volume</Text>
              <Text style={styles.detailValue}>{summary.totalVolumeLb.toLocaleString()} lb</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⏱</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{formatDuration(summary.durationSeconds)}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailIcon}>🎯</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Trained Muscle Groups</Text>
              <Text style={styles.detailValue}>
                {summary.trainedMuscles.length > 0 ? summary.trainedMuscles.join(', ') : 'Full Body'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Detailed Exercise Breakdown */}
        <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
        {summary.exercises.map((ex, idx) => {
          const completedSets = ex.sets.filter(s => s.isCompleted);
          const exerciseVolume = completedSets.reduce((acc, s) => acc + s.weight * s.reps, 0);

          return (
            <View key={ex.instanceId || `ex_sum_${idx}`} style={styles.exerciseCard}>
              <View style={styles.exTopRow}>
                {ex.image ? (
                  <Image source={{ uri: ex.image }} style={styles.exThumb} />
                ) : (
                  <View style={[styles.exThumb, styles.exThumbPlaceholder]}>
                    <Text style={{ fontSize: 16 }}>🏋️</Text>
                  </View>
                )}
                <View style={styles.exMeta}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exSub}>
                    {exerciseVolume.toLocaleString()} lb volume • {completedSets.length} sets
                  </Text>
                </View>
              </View>

              {/* Set Pills */}
              <View style={styles.setsSummaryRow}>
                {completedSets.map((s, sIdx) => (
                  <View key={`s_${sIdx}`} style={styles.setSummaryBadge}>
                    <Text style={styles.setSummaryText}>
                      Set {s.setNumber}: {s.weight} lb × {s.reps}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Done Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121418',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#20232a',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#242730',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 24,
  },
  skeletonCard: {
    backgroundColor: '#171920',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#242733',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  prCarousel: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  prCard: {
    width: 170,
    backgroundColor: '#181b22',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262a34',
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  prTrophy: {
    fontSize: 22,
    marginRight: 8,
  },
  prScore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  prNew: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4cd964',
  },
  prExerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e0e4ec',
    marginBottom: 2,
  },
  prCategory: {
    fontSize: 11,
    color: '#767e8c',
  },
  detailsCard: {
    backgroundColor: '#181b22',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262a34',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#22252e',
  },
  detailIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#7b8290',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  exerciseCard: {
    backgroundColor: '#181b22',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262a34',
  },
  exTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#20232a',
  },
  exThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exMeta: {
    flex: 1,
    marginLeft: 12,
  },
  exName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
  },
  exSub: {
    fontSize: 12,
    color: '#7d8594',
  },
  setsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#20232b',
  },
  setSummaryBadge: {
    backgroundColor: '#20242e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setSummaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ba2b2',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#20232a',
    backgroundColor: '#121418',
  },
  doneBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
});
