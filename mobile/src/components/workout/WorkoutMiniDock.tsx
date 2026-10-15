import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { useWorkoutSessionStore } from '../../store/useWorkoutSessionStore';

export const WorkoutMiniDock: React.FC = () => {
  const {
    isActive,
    isMinimized,
    workoutName,
    elapsedSeconds,
    exercises,
    minimizeWorkout,
  } = useWorkoutSessionStore();

  if (!isActive || !isMinimized) return null;

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const doneSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length,
    0
  );

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => minimizeWorkout(false)}
      activeOpacity={0.9}
    >
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Rect x="2" y="9" width="3" height="6" rx="1" fill="#000000" />
            <Rect x="5" y="7" width="2" height="10" rx="1" fill="#000000" />
            <Line x1="7" y1="12" x2="17" y2="12" stroke="#000000" strokeWidth="2.5" />
            <Rect x="17" y="7" width="2" height="10" rx="1" fill="#000000" />
            <Rect x="19" y="9" width="3" height="6" rx="1" fill="#000000" />
          </Svg>
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.routineName} numberOfLines={1}>
            {workoutName}
          </Text>
          <Text style={styles.metaText}>
            {formatElapsed(elapsedSeconds)} · {doneSets}/{totalSets} sets
          </Text>
        </View>
      </View>

      <View style={styles.resumeBtn}>
        <Text style={styles.resumeText}>Resume ›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 74, // Docked cleanly right above bottom navigation bar
    left: 12,
    right: 12,
    backgroundColor: '#121d17',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  routineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ade80',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  resumeBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resumeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
});

export default WorkoutMiniDock;
