import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { colors } from '../../theme/colors';
import { MuscleSkeletonMap } from './MuscleSkeletonMap';
import { ExerciseRecord, mapExerciseToMuscles, MuscleKey } from '../../utils/muscleTargetMapper';

export interface RoutinePreviewItem {
  id: string;
  name: string;
  category: string;
  target: string;
  secondary?: string[];
  equipment: string;
  image?: string;
  gifUrl?: string;
  targetSets?: number;
  targetReps?: string | number;
}

interface WorkoutPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  exercises: RoutinePreviewItem[];
  onStartWorkout: (name: string, exercises: (ExerciseRecord & { targetSets?: number; targetReps?: string | number })[]) => void;
}

export const WorkoutPreviewModal: React.FC<WorkoutPreviewModalProps> = ({
  visible,
  onClose,
  title,
  subtitle = 'Curated Routine',
  exercises,
  onStartWorkout,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = useSafeTopInset(10);

  // Compute target muscles for the skeleton preview
  const highlightedMuscles = useMemo(() => {
    const muscles = new Set<MuscleKey>();
    exercises.forEach(ex => {
      const mapped = mapExerciseToMuscles(ex.target, ex.secondary);
      mapped.primary.forEach(m => muscles.add(m));
    });
    return Array.from(muscles);
  }, [exercises]);

  const totalSets = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + (ex.targetSets || 3), 0);
  }, [exercises]);

  const estimatedMins = Math.round(exercises.length * 9 + 5);

  const handleStart = () => {
    const converted = exercises.map(e => ({
      id: e.id,
      name: e.name,
      category: e.category,
      target: e.target,
      secondary: e.secondary || [],
      equipment: e.equipment,
      image: e.image || '',
      gifUrl: e.gifUrl || '',
      instructions: [],
      targetSets: e.targetSets || 3,
      targetReps: e.targetReps || '8-10',
    }));
    onStartWorkout(title, converted);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header Bar */}
        <View style={[styles.header, { paddingTop: topInset }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* Hero Muscle Anatomy Preview */}
          <View style={styles.anatomyCard}>
            <View style={styles.anatomyLeft}>
              <Text style={styles.anatomyHeadline}>Target Muscle Groups</Text>
              <Text style={styles.anatomySub}>
                {highlightedMuscles.length > 0
                  ? highlightedMuscles.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' • ')
                  : 'Full Body Activation'}
              </Text>

              {/* Stat Chips */}
              <View style={styles.statChipsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statChipNum}>{exercises.length}</Text>
                  <Text style={styles.statChipLbl}>Exercises</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipNum}>{totalSets}</Text>
                  <Text style={styles.statChipLbl}>Total Sets</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipNum}>~{estimatedMins}m</Text>
                  <Text style={styles.statChipLbl}>Est Time</Text>
                </View>
              </View>
            </View>

            {/* Skeleton Map */}
            <View style={styles.anatomyFigureWrap}>
              <MuscleSkeletonMap
                highlightedMuscles={highlightedMuscles}
                width={85}
                height={150}
                showLabels={false}
              />
            </View>
          </View>

          {/* Exercise List */}
          <Text style={styles.sectionTitle}>Movement Plan ({exercises.length})</Text>

          {exercises.map((item, idx) => {
            const sets = item.targetSets || 3;
            const reps = item.targetReps || '8-10 reps';

            return (
              <View key={`${item.id}_${idx}`} style={styles.exerciseCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{idx + 1}</Text>
                  </View>
                  {item.gifUrl ? (
                    <Image source={{ uri: item.gifUrl }} style={styles.thumb} />
                  ) : item.image ? (
                    <Image source={{ uri: item.image }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Text style={styles.thumbIcon}>🏋️</Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardSub}>
                      {item.target ? `${item.target.toUpperCase()} • ` : ''}{item.equipment || 'Bodyweight'}
                    </Text>
                  </View>
                </View>

                {/* Target Sets & Reps Pill */}
                <View style={styles.setsPlanBar}>
                  <View style={styles.targetSetBadge}>
                    <Text style={styles.targetSetText}>Target: {sets} Sets</Text>
                  </View>
                  <View style={styles.targetRepsBadge}>
                    <Text style={styles.targetRepsText}>{reps}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom CTA Bar */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.startBtnIcon}>▶</Text>
            <Text style={styles.startBtnText}>Start Workout Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1d212b',
    backgroundColor: '#15181f',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#20242e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94a0b8',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  anatomyCard: {
    flexDirection: 'row',
    backgroundColor: '#171a23',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262c3b',
    marginBottom: 20,
    alignItems: 'center',
  },
  anatomyLeft: {
    flex: 1,
    paddingRight: 10,
  },
  anatomyHeadline: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  anatomySub: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  statChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    backgroundColor: '#1e2433',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b3448',
    alignItems: 'center',
  },
  statChipNum: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '900',
  },
  statChipLbl: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  anatomyFigureWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12141a',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#222838',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: '#171a22',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#232836',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#242a3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#20242e',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 20,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  setsPlanBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e2330',
    gap: 8,
  },
  targetSetBadge: {
    backgroundColor: '#1e273a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  targetSetText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
  },
  targetRepsBadge: {
    backgroundColor: '#202634',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  targetRepsText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#15181f',
    borderTopWidth: 1,
    borderTopColor: '#1e2330',
  },
  startBtn: {
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
  startBtnIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 8,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
