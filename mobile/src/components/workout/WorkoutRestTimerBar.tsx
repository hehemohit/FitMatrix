import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useWorkoutSessionStore } from '../../store/useWorkoutSessionStore';

export const WorkoutRestTimerBar: React.FC = () => {
  const {
    restTimerActive,
    restTimerSeconds,
    adjustRestTimer,
    stopRestTimer,
    setRestSheetOpen,
  } = useWorkoutSessionStore();

  if (!restTimerActive || restTimerSeconds <= 0) return null;

  const mins = Math.floor(restTimerSeconds / 60);
  const secs = restTimerSeconds % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.leftGroup}
        onPress={() => setRestSheetOpen(true)}
        activeOpacity={0.8}
      >
        <View style={styles.pulseDot} />
        <Text style={styles.label}>Rest</Text>
        <Text style={styles.timerNum}>{timeFormatted}</Text>
      </TouchableOpacity>

      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => adjustRestTimer(30)}
          activeOpacity={0.7}
        >
          <Text style={styles.plusBtnText}>+30s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={stopRestTimer}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#102217',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#86efac',
  },
  timerNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBtn: {
    backgroundColor: '#1e3827',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  plusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ade80',
  },
  skipBtn: {
    backgroundColor: '#1f2430',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
});

export default WorkoutRestTimerBar;
