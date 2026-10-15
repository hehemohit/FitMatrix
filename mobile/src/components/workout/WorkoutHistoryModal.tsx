import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useWorkoutHistoryStore, CompletedWorkoutRecord } from '../../store/useWorkoutHistoryStore';
import { WorkoutDetailModal } from './WorkoutDetailModal';

interface WorkoutHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WorkoutHistoryModal: React.FC<WorkoutHistoryModalProps> = ({
  visible,
  onClose,
}) => {
  const topInset = useSafeTopInset(12);
  const { workouts, deleteWorkout } = useWorkoutHistoryStore();
  const [search, setSearch] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState<CompletedWorkoutRecord | null>(null);

  const filteredWorkouts = React.useMemo(() => {
    if (!search.trim()) return workouts;
    const q = search.toLowerCase();
    return workouts.filter(w => {
      const routineMatch = w.routineName?.toLowerCase().includes(q);
      const exMatch = w.exercises?.some(e => e.name.toLowerCase().includes(q));
      return routineMatch || exMatch;
    });
  }, [workouts, search]);

  const confirmDelete = (workout: CompletedWorkoutRecord) => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workout.routineName}" from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWorkout(workout.id),
        },
      ]
    );
  };

  const renderWorkoutCard = ({ item }: { item: CompletedWorkoutRecord }) => {
    const d = item.completedAt ? new Date(item.completedAt) : new Date();
    const dateFormatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const durationMin = Math.round((item.durationSeconds || 0) / 60);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setSelectedWorkout(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.routineName}</Text>
            <Text style={styles.cardDate}>{dateFormatted}</Text>
          </View>
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            style={styles.deleteIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteIconText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Pill Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillText}>⏱️ {durationMin} min</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillText}>🏋️ {item.totalVolumeLb.toLocaleString()} lb</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillText}>📋 {item.totalSets} sets</Text>
          </View>
        </View>

        {/* Exercises Preview */}
        <View style={styles.exercisesList}>
          {item.exercises.slice(0, 3).map((ex, idx) => (
            <Text key={`ex-${idx}`} style={styles.exercisePreviewText} numberOfLines={1}>
              • {ex.name} ({ex.sets.filter(s => s.isCompleted).length} sets)
            </Text>
          ))}
          {item.exercises.length > 3 && (
            <Text style={styles.exerciseMoreText}>
              +{item.exercises.length - 3} more exercises
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
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

        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Workout History</Text>
            <Text style={styles.headerSubtitle}>
              {workouts.length} total completed {workouts.length === 1 ? 'session' : 'sessions'}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search workouts or exercises..."
            placeholderTextColor="#6b7280"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        {/* History List */}
        <FlatList
          data={filteredWorkouts}
          keyExtractor={item => item.id}
          renderItem={renderWorkoutCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No workouts found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try another search term' : 'Complete your first workout to see it here!'}
              </Text>
            </View>
          }
        />

        {/* Workout Detail Sheet */}
        <WorkoutDetailModal
          visible={!!selectedWorkout}
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onDelete={id => deleteWorkout(id)}
        />
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
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#12151c',
  },
  searchInput: {
    backgroundColor: '#1c202d',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a3044',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  deleteIconBtn: {
    padding: 4,
  },
  deleteIconText: {
    color: '#6b7280',
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metricPill: {
    backgroundColor: '#1c202d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#282e42',
  },
  metricPillText: {
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: '600',
  },
  exercisesList: {
    borderTopWidth: 1,
    borderTopColor: '#202434',
    paddingTop: 8,
    gap: 3,
  },
  exercisePreviewText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  exerciseMoreText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#6b7280',
  },
});
