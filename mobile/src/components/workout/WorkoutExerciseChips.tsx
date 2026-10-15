import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ActiveWorkoutExercise } from '../../store/useWorkoutSessionStore';

interface WorkoutExerciseChipsProps {
  exercises: ActiveWorkoutExercise[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
}

export const WorkoutExerciseChips: React.FC<WorkoutExerciseChipsProps> = ({
  exercises,
  activeIndex,
  onSelectIndex,
}) => {
  const scrollRef = useRef<any>(null);

  // Auto-scroll active chip into view
  useEffect(() => {
    if (scrollRef.current && activeIndex >= 0) {
      scrollRef.current.scrollTo({
        x: Math.max(0, activeIndex * 130 - 30),
        animated: true,
      });
    }
  }, [activeIndex]);

  if (!exercises || exercises.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {exercises.map((ex, idx) => {
          const isCurrent = idx === activeIndex;
          const doneSets = ex.sets.filter(s => s.isCompleted).length;
          const allDone = ex.sets.length > 0 && doneSets === ex.sets.length;

          return (
            <TouchableOpacity
              key={ex.instanceId || `ex_chip_${idx}`}
              style={[
                styles.chip,
                isCurrent && styles.chipActive,
                allDone && styles.chipAllDone,
              ]}
              onPress={() => onSelectIndex(idx)}
              activeOpacity={0.75}
            >
              {allDone ? (
                <Text style={styles.checkDoneIcon}>✓</Text>
              ) : (
                <Text style={[styles.indexText, isCurrent && styles.indexTextActive]}>
                  {idx + 1}.
                </Text>
              )}

              <Text
                style={[
                  styles.nameText,
                  isCurrent && styles.nameTextActive,
                  allDone && styles.nameTextAllDone,
                ]}
                numberOfLines={1}
              >
                {ex.name}
              </Text>

              {doneSets > 0 && !allDone && (
                <Text style={styles.progressSubText}>
                  {doneSets}/{ex.sets.length}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0a0c10',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#161922',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161922',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242838',
    gap: 6,
    maxWidth: 160,
  },
  chipActive: {
    backgroundColor: '#112218',
    borderColor: '#22c55e',
  },
  chipAllDone: {
    borderColor: '#15803d',
    backgroundColor: '#0e1d15',
  },
  checkDoneIcon: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '900',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  indexTextActive: {
    color: '#22c55e',
  },
  nameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    flexShrink: 1,
  },
  nameTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  nameTextAllDone: {
    color: '#86efac',
  },
  progressSubText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '700',
  },
});

export default WorkoutExerciseChips;
