import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';

interface TodaySessionHeroProps {
  isActive: boolean;
  activeWorkoutName?: string;
  activeElapsedSeconds?: number;
  completedTodayWorkout?: {
    routineName: string;
    totalSets: number;
    totalVolumeLb: number;
  } | null;
  plannedRoutine?: {
    name: string;
    exercisesCount: number;
    targetMuscles?: string[];
  } | null;
  nextSessionText?: string;
  onResume: () => void;
  onStartPlanned: () => void;
  onStartFreestyle: () => void;
}

export const TodaySessionHero: React.FC<TodaySessionHeroProps> = ({
  isActive,
  activeWorkoutName = 'Live Workout',
  activeElapsedSeconds = 0,
  completedTodayWorkout,
  plannedRoutine,
  nextSessionText,
  onResume,
  onStartPlanned,
  onStartFreestyle,
}) => {
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // State 1: Active In-Progress Workout
  if (isActive) {
    return (
      <View style={[styles.card, styles.cardActive]}>
        <View style={styles.topRow}>
          <View style={styles.badgeOrange}>
            <Text style={styles.badgeTextOrange}>● IN PROGRESS</Text>
          </View>
          <Text style={styles.timerText}>{formatDuration(activeElapsedSeconds)}</Text>
        </View>

        <Text style={styles.title}>{activeWorkoutName}</Text>
        <Text style={styles.sub}>Session currently active. Tap below to continue logging.</Text>

        <TouchableOpacity style={styles.resumeBtn} onPress={onResume} activeOpacity={0.85}>
          <Text style={styles.resumeBtnText}>Resume Workout ➔</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 2: Workout Completed Today
  if (completedTodayWorkout) {
    return (
      <View style={[styles.card, styles.cardDone]}>
        <View style={styles.topRow}>
          <View style={styles.badgeGreen}>
            <Text style={styles.badgeTextGreen}>✓ COMPLETED TODAY</Text>
          </View>
          <Text style={styles.statChipText}>{completedTodayWorkout.totalSets} Sets Done</Text>
        </View>

        <Text style={styles.title}>{completedTodayWorkout.routineName}</Text>
        <Text style={styles.sub}>
          {completedTodayWorkout.totalVolumeLb.toLocaleString()} Lb total volume tracked. Great work today!
        </Text>

        <TouchableOpacity style={styles.ghostBtn} onPress={onStartFreestyle} activeOpacity={0.8}>
          <Text style={styles.ghostBtnText}>Log Another Session +</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 3: Planned Routine for Today
  if (plannedRoutine) {
    return (
      <View style={[styles.card, styles.cardPlan]}>
        <View style={styles.topRow}>
          <View style={styles.badgeBlue}>
            <Text style={styles.badgeTextBlue}>⚡ TODAY'S TARGET</Text>
          </View>
          <Text style={styles.statChipText}>{plannedRoutine.exercisesCount} Movements</Text>
        </View>

        <Text style={styles.title}>{plannedRoutine.name}</Text>
        <Text style={styles.sub}>
          {plannedRoutine.targetMuscles && plannedRoutine.targetMuscles.length > 0
            ? plannedRoutine.targetMuscles.join(' • ')
            : 'Custom Routine'}{' '}
          • Ready when you are.
        </Text>

        <TouchableOpacity style={styles.startBtn} onPress={onStartPlanned} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>▶ Start Today's Routine</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 4: Rest Day
  return (
    <View style={[styles.card, styles.cardRest]}>
      <View style={styles.topRow}>
        <View style={styles.badgeMuted}>
          <Text style={styles.badgeTextMuted}>🌙 RECOVERY DAY</Text>
        </View>
        <Text style={styles.statChipText}>Rest & Grow</Text>
      </View>

      <Text style={styles.title}>Scheduled Rest Day</Text>
      <Text style={styles.sub}>
        {nextSessionText ? `Next session: ${nextSessionText}` : 'Muscles repair and grow during rest periods.'}
      </Text>

      <TouchableOpacity style={styles.freestyleBtn} onPress={onStartFreestyle} activeOpacity={0.85}>
        <Text style={styles.freestyleBtnText}>Start Freestyle Session +</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242a38',
    marginBottom: 18,
  },
  cardActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#1a191c',
  },
  cardDone: {
    borderColor: '#10b981',
    backgroundColor: '#131b18',
  },
  cardPlan: {
    borderColor: '#3b82f6',
    backgroundColor: '#131826',
  },
  cardRest: {
    borderColor: '#252936',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeOrange: {
    backgroundColor: '#3b2510',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#78430e',
  },
  badgeTextOrange: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeGreen: {
    backgroundColor: '#112d22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#155e43',
  },
  badgeTextGreen: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeBlue: {
    backgroundColor: '#162b4c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#254b85',
  },
  badgeTextBlue: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeMuted: {
    backgroundColor: '#1e232d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTextMuted: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  sub: {
    color: '#7a8599',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  resumeBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  startBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  ghostBtn: {
    backgroundColor: '#1a2228',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#223830',
  },
  ghostBtnText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
  },
  freestyleBtn: {
    backgroundColor: '#1f2533',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d374d',
  },
  freestyleBtnText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '800',
  },
});
