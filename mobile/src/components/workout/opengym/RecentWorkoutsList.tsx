import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CompletedWorkoutRecord } from '../../../store/useWorkoutHistoryStore';

interface RecentWorkoutsListProps {
  workouts: CompletedWorkoutRecord[];
  onSelectWorkout: (workout: CompletedWorkoutRecord) => void;
}

export const RecentWorkoutsList: React.FC<RecentWorkoutsListProps> = ({
  workouts,
  onSelectWorkout,
}) => {
  if (workouts.length === 0) {
    return null;
  }

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    return `${mins}m`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Sessions</Text>
      <View style={styles.list}>
        {workouts.slice(0, 4).map(w => (
          <TouchableOpacity
            key={w.id}
            style={styles.card}
            onPress={() => onSelectWorkout(w)}
            activeOpacity={0.8}
          >
            <View style={styles.topRow}>
              <Text style={styles.routineName} numberOfLines={1}>
                {w.routineName}
              </Text>
              <Text style={styles.dateText}>{formatDate(w.completedAt)}</Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.statPill}>
                <Text style={styles.statNum}>{w.totalVolumeLb.toLocaleString()}</Text>
                <Text style={styles.statLbl}> Lb Vol</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statNum}>{w.totalSets}</Text>
                <Text style={styles.statLbl}> Sets</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statNum}>{formatDuration(w.durationSeconds)}</Text>
                <Text style={styles.statLbl}> Time</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222836',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routineName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 10,
  },
  dateText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#1c2230',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statNum: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
  },
  statLbl: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
});
