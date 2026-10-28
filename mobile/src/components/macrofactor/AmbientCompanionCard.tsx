import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import type { AmbientBriefingData } from '../../api/coachApi';

interface AmbientCompanionCardProps {
  readinessScore?: number | null;
  fatigueFlag?: string | null;
  prescribedWorkout?: string | null;
  sleepHours?: string;
  stepsToday?: number;
  restingHeartRate?: number;
  dailyBriefing?: AmbientBriefingData | null;
  briefingLoading?: boolean;
  onRefreshBriefing?: () => void;
  onLaunchWorkout?: () => void;
  onLogMealPress?: () => void;
}

export const AmbientCompanionCard: React.FC<AmbientCompanionCardProps> = ({
  readinessScore = 80,
  fatigueFlag = 'nominal',
  prescribedWorkout,
  sleepHours = '7.2',
  stepsToday = 6540,
  restingHeartRate = 58,
  dailyBriefing,
  briefingLoading = false,
  onRefreshBriefing,
  onLaunchWorkout,
  onLogMealPress,
}) => {
  const effectiveScore = dailyBriefing?.readiness_score ?? readinessScore ?? 80;
  const effectiveFatigue = dailyBriefing?.fatigue_flag ?? fatigueFlag ?? 'nominal';
  const isFatigued = effectiveFatigue === 'high_fatigue' || effectiveScore < 60;

  const scoreBadgeColor = isFatigued ? colors.accentOrange : colors.accentGreen;
  const scoreBadgeText = dailyBriefing?.headline ?? (isFatigued ? 'Recovery Required' : 'Optimal Readiness');

  const mesoWeek = dailyBriefing?.mesocycle_week ?? 1;
  const targetRir = dailyBriefing?.target_rir ?? 2;
  const periCarbs = dailyBriefing?.peri_workout_carbs_g ?? 40;

  return (
    <View style={styles.card}>
      {/* Header with Title, Badge, and Manual Refresh */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.sparkle}>⚡</Text>
          <Text style={styles.title}>Companion Intelligence</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, { backgroundColor: scoreBadgeColor + '22' }]}>
            <Text style={[styles.badgeText, { color: scoreBadgeColor }]}>{scoreBadgeText}</Text>
          </View>
          {onRefreshBriefing && (
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefreshBriefing}
              disabled={briefingLoading}
              activeOpacity={0.7}
            >
              {briefingLoading ? (
                <ActivityIndicator size="small" color={colors.accentBlue} />
              ) : (
                <Text style={styles.refreshIcon}>🔄</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Readiness & Biometrics Row */}
      <View style={styles.metricRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{effectiveScore}</Text>
          <Text style={styles.metricLabel}>Readiness</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{dailyBriefing?.sleep_hours ?? sleepHours}h</Text>
          <Text style={styles.metricLabel}>Sleep</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{dailyBriefing?.resting_heart_rate_bpm ?? restingHeartRate ?? '--'}</Text>
          <Text style={styles.metricLabel}>Resting HR</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>
            {(dailyBriefing?.steps_today ?? stepsToday)?.toLocaleString() || '--'}
          </Text>
          <Text style={styles.metricLabel}>Steps</Text>
        </View>
      </View>

      {/* Mesocycle & Peri-Workout Badges */}
      <View style={styles.chipsRow}>
        <View style={styles.chipPill}>
          <Text style={styles.chipText}>📊 Week {mesoWeek} / 6 • {targetRir} RIR</Text>
        </View>
        <View style={styles.chipPill}>
          <Text style={styles.chipText}>⚡ {periCarbs}g Pre-Workout Carbs</Text>
        </View>
        {dailyBriefing?.cached && (
          <View style={[styles.chipPill, styles.cachedPill]}>
            <Text style={styles.cachedText}>Cached Today</Text>
          </View>
        )}
      </View>

      {/* Morning Physiological Briefing Box */}
      <View style={styles.guidanceBox}>
        <Text style={styles.guidanceLabel}>
          {isFatigued ? 'AUTO-REGULATED RECOVERY PRESCRIPTION' : 'MORNING PHYSIOLOGICAL BRIEFING'}
        </Text>
        <Text style={styles.guidanceText}>
          {dailyBriefing?.briefing_text ||
            prescribedWorkout ||
            (isFatigued
              ? 'Nervous system strain detected. Keep working intensity capped at RPE 6–7 and drop back-off failure sets.'
              : 'Recovery baseline is strong. You are cleared for high-intensity progressive overload in your planned session.')}
        </Text>
      </View>

      {/* Contextual 1-Tap Quick Action Chips */}
      <View style={styles.actionsRow}>
        {onLaunchWorkout && (
          <TouchableOpacity style={styles.actionBtn} onPress={onLaunchWorkout} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>🏋️ Start Workout</Text>
          </TouchableOpacity>
        )}
        {onLogMealPress && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={onLogMealPress} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>🥗 Fuel Window</Text>
          </TouchableOpacity>
        )}
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
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  refreshBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#26262a',
  },
  refreshIcon: {
    fontSize: 12,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.appDark,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chipPill: {
    backgroundColor: '#22252e',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2e3342',
  },
  chipText: {
    fontSize: 11,
    color: '#9ba1b0',
    fontWeight: '600',
  },
  cachedPill: {
    backgroundColor: '#1b2923',
    borderColor: '#254435',
  },
  cachedText: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '600',
  },
  guidanceBox: {
    backgroundColor: colors.cardHeader,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1a73e8',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: '#2c2c30',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
