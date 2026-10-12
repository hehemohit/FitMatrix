import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface AmbientCompanionCardProps {
  readinessScore?: number | null;
  fatigueFlag?: string | null;
  prescribedWorkout?: string | null;
  sleepHours?: string;
  stepsToday?: number;
  restingHeartRate?: number;
}

export const AmbientCompanionCard: React.FC<AmbientCompanionCardProps> = ({
  readinessScore = 80,
  fatigueFlag = 'nominal',
  prescribedWorkout,
  sleepHours = '7.2',
  stepsToday = 6540,
  restingHeartRate = 58,
}) => {
  const isFatigued = fatigueFlag === 'high_fatigue' || (readinessScore != null && readinessScore < 60);
  const scoreBadgeColor = isFatigued ? colors.accentOrange : colors.accentGreen;
  const scoreBadgeText = isFatigued ? 'Fatigue Flag' : 'Optimal Recovery';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.sparkle}>⚡</Text>
          <Text style={styles.title}>Companion Intelligence</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: scoreBadgeColor + '22' }]}>
          <Text style={[styles.badgeText, { color: scoreBadgeColor }]}>{scoreBadgeText}</Text>
        </View>
      </View>

      {/* Readiness & Biometrics Row */}
      <View style={styles.metricRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{readinessScore ?? 80}</Text>
          <Text style={styles.metricLabel}>Readiness</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{sleepHours}h</Text>
          <Text style={styles.metricLabel}>Sleep</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{restingHeartRate || '--'}</Text>
          <Text style={styles.metricLabel}>Resting HR</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{stepsToday ? stepsToday.toLocaleString() : '--'}</Text>
          <Text style={styles.metricLabel}>Steps</Text>
        </View>
      </View>

      {/* Auto-Regulated Training Guidance */}
      <View style={styles.guidanceBox}>
        <Text style={styles.guidanceLabel}>AUTO-REGULATED TRAINING PRESCRIPTION</Text>
        <Text style={styles.guidanceText}>
          {prescribedWorkout ||
            (isFatigued
              ? 'Nervous system strain detected. Keep working intensity capped at RPE 6–7 and drop back-off failure sets.'
              : 'Recovery baseline is strong. You are cleared for high-intensity progressive overload (RPE 8–9).')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg, // #1c1c1e
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkle: {
    fontSize: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.appDark,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.borderSubtle,
  },
  guidanceBox: {
    backgroundColor: colors.cardHeader,
    borderRadius: 10,
    padding: 12,
  },
  guidanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentBlue,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  guidanceText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});
