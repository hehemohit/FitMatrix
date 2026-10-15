import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface DualWorkoutHeaderProps {
  elapsedSeconds: number;
  restSeconds: number;
  restTimerActive: boolean;
  isPaused: boolean;
  onOpenMenu: () => void;
  onOpenRestSheet: () => void;
}

export const DualWorkoutHeader: React.FC<DualWorkoutHeaderProps> = ({
  elapsedSeconds,
  restSeconds,
  restTimerActive,
  isPaused,
  onOpenMenu,
  onOpenRestSheet,
}) => {
  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      {/* Left: Menu & Workout Duration */}
      <TouchableOpacity style={styles.leftGroup} onPress={onOpenMenu} activeOpacity={0.7}>
        <Text style={styles.hamburgerIcon}>☰</Text>
        <Text style={[styles.durationText, isPaused && styles.durationPaused]}>
          {formatDuration(elapsedSeconds)}
        </Text>
        {isPaused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>PAUSED</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Right: Rest Timer */}
      <TouchableOpacity
        style={[styles.rightGroup, restTimerActive && styles.rightGroupActive]}
        onPress={onOpenRestSheet}
        activeOpacity={0.7}
      >
        <Text style={styles.timerIcon}>⏱</Text>
        <Text style={[styles.restText, restTimerActive && styles.restTextActive]}>
          {formatDuration(restSeconds)}
        </Text>
        {restTimerActive && <View style={styles.activeDot} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#121418',
    borderBottomWidth: 1,
    borderBottomColor: '#20232a',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hamburgerIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
  },
  durationText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  durationPaused: {
    color: '#e5a43b',
  },
  pausedBadge: {
    backgroundColor: '#423315',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pausedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f5b041',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1d24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292d37',
  },
  rightGroupActive: {
    backgroundColor: '#182b47',
    borderColor: '#4b88eb',
  },
  timerIcon: {
    fontSize: 14,
  },
  restText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8b93a2',
    fontVariant: ['tabular-nums'],
  },
  restTextActive: {
    color: '#7ba9f5',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4b88eb',
  },
});
