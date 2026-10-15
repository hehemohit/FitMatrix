import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';

interface WorkoutHeaderBarProps {
  workoutName: string;
  elapsedSeconds: number;
  doneSets: number;
  totalSets: number;
  onMinimize: () => void;
  onOpenMenu: () => void;
  onFinish: () => void;
}

export const WorkoutHeaderBar: React.FC<WorkoutHeaderBarProps> = ({
  workoutName,
  elapsedSeconds,
  doneSets,
  totalSets,
  onMinimize,
  onOpenMenu,
  onFinish,
}) => {
  const topInset = useSafeTopInset(10);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = totalSets > 0 ? Math.min(100, Math.round((doneSets / totalSets) * 100)) : 0;

  return (
    <View style={[styles.container, { paddingTop: topInset + 6 }]}>
      {/* Top Action Bar */}
      <View style={styles.bar}>
        {/* Left: ⌄ Minimize Chevron */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onMinimize}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 9L12 15L18 9"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* Center: Workout Name + Stopwatch + Sets fraction */}
        <View style={styles.centerCol}>
          <Text style={styles.workoutTitle} numberOfLines={1}>
            {workoutName}
          </Text>
          <Text style={styles.subtitle}>
            {formatElapsed(elapsedSeconds)} · {doneSets}/{totalSets} sets
          </Text>
        </View>

        {/* Right Actions: ⋯ More Menu & Finish Pill Button */}
        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenMenu}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="5" r="1.75" fill="#9ca3af" />
              <Circle cx="12" cy="12" r="1.75" fill="#9ca3af" />
              <Circle cx="12" cy="19" r="1.75" fill="#9ca3af" />
            </Svg>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishPillBtn}
            onPress={onFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.finishPillText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seamless Progress Line (wprog) */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0e1017',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1e29',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  workoutTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finishPillBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  finishPillText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: '#1b1f2b',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
});

export default WorkoutHeaderBar;
