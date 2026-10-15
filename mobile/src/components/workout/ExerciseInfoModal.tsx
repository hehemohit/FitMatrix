import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { ExerciseRecord, mapExerciseToMuscles } from '../../utils/muscleTargetMapper';
import { MuscleSkeletonMap } from './MuscleSkeletonMap';

interface ExerciseInfoModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: ExerciseRecord | null;
}

export const ExerciseInfoModal: React.FC<ExerciseInfoModalProps> = ({
  visible,
  onClose,
  exercise,
}) => {
  const muscles = useMemo(() => {
    if (!exercise) return { primary: [], secondary: [] };
    return mapExerciseToMuscles(exercise.target, exercise.secondary);
  }, [exercise]);

  if (!exercise) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Exercise Details</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* Title & Badges */}
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgePrimary}>
              <Text style={styles.badgePrimaryText}>{exercise.target}</Text>
            </View>
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>{exercise.equipment}</Text>
            </View>
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>{exercise.category}</Text>
            </View>
          </View>

          {/* Animation GIF or Image */}
          {exercise.gifUrl || exercise.image ? (
            <View style={styles.mediaContainer}>
              <Image
                source={{ uri: exercise.gifUrl || exercise.image }}
                style={styles.media}
                resizeMode="contain"
              />
            </View>
          ) : null}

          {/* Targeted Muscles Skeleton Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Targeted Muscles</Text>
            <View style={styles.skeletonContainer}>
              <MuscleSkeletonMap
                highlightedMuscles={muscles.primary}
                secondaryMuscles={muscles.secondary}
                width={100}
                height={170}
                showLabels={true}
              />
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4b88eb' }]} />
                <Text style={styles.legendText}>Primary: {exercise.target}</Text>
              </View>
              {exercise.secondary.length > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4b88eb66' }]} />
                  <Text style={styles.legendText}>Secondary: {exercise.secondary.join(', ')}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Instructions */}
          {exercise.instructions && (
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Step-by-Step Instructions</Text>
              {Array.isArray(exercise.instructions) ? (
                exercise.instructions.map((step, idx) => (
                  <View key={`step_${idx}`} style={styles.stepRow}>
                    <View style={styles.stepNumCircle}>
                      <Text style={styles.stepNumText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.stepText}>{String(exercise.instructions)}</Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appDark,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#262930',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badgePrimary: {
    backgroundColor: '#1b325c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePrimaryText: {
    color: '#7ba9f5',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  badgeSecondary: {
    backgroundColor: '#22252c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSecondaryText: {
    color: '#a0a6b2',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  mediaContainer: {
    backgroundColor: '#1a1c22',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262933',
  },
  media: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#181a20',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252832',
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  skeletonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  legendRow: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#242730',
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: '#9fa6b3',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2a2f3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNumText: {
    color: '#7ba9f5',
    fontWeight: '700',
    fontSize: 11,
  },
  stepText: {
    flex: 1,
    color: '#d0d4dd',
    fontSize: 13,
    lineHeight: 19,
  },
  doneBtn: {
    backgroundColor: '#262a34',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
