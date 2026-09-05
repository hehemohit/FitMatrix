import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WorkoutDay, Exercise } from '../../types/plans';

interface WorkoutCardProps {
  day: WorkoutDay;
}

const ExerciseRow: React.FC<{ exercise: Exercise }> = ({ exercise }) => (
  <View style={styles.exerciseRow}>
    <Text style={styles.exerciseName}>{exercise.name}</Text>
    <Text style={styles.exerciseMeta}>
      {exercise.sets}×{exercise.reps}
      {exercise.rpe != null ? ` · RPE ${exercise.rpe}` : ''}
      {exercise.restSeconds != null ? ` · ${exercise.restSeconds}s rest` : ''}
    </Text>
    {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}
  </View>
);

export const WorkoutCard: React.FC<WorkoutCardProps> = ({ day }) => {
  const muscleGroups = day.targetMuscleGroups ?? (day as any).target_muscle_groups ?? [];
  const exercises = day.exercises ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.day}>{day.day}</Text>
        <View style={styles.muscleGroup}>
          {muscleGroups.map(group => (
            <View key={group} style={styles.chip}>
              <Text style={styles.chipText}>{group}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.divider} />
      {exercises.map((ex, idx) => (
        <ExerciseRow key={`${ex.name}-${idx}`} exercise={ex} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  header: {
    marginBottom: 10,
  },
  day: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  muscleGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#e8f0fe',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 11,
    color: '#1a73e8',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 10,
  },
  exerciseRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  exerciseMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  exerciseNotes: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
});
