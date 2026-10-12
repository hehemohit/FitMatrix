import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { GoalType, StrategyProfile } from '../../types/schema';

interface GoalEtaCardProps {
  profile: StrategyProfile | null;
  onUpdateGoal: (params: {
    goal_type: GoalType;
    target_weight_kg: number;
    weekly_rate_percent: number;
  }) => void;
  loading?: boolean;
}

const GOAL_OPTIONS: Array<{ key: GoalType; label: string; icon: string }> = [
  { key: 'fat_loss', label: 'Fat Loss', icon: '🔥' },
  { key: 'maintenance', label: 'Maintain', icon: '⚖️' },
  { key: 'muscle_gain', label: 'Muscle Gain', icon: '⚡' },
];

export const GoalEtaCard: React.FC<GoalEtaCardProps> = ({
  profile,
  onUpdateGoal,
  loading = false,
}) => {
  const currentWeight = profile?.current_weight_kg ?? 78.4;
  const initialGoal = profile?.goal_type ?? 'fat_loss';
  const initialTargetWeight = profile?.target_weight_kg ?? 75.0;
  const initialRate = profile?.weekly_rate_percent ?? -0.75;

  const [selectedGoal, setSelectedGoal] = useState<GoalType>(initialGoal);
  const [targetWeight, setTargetWeight] = useState<number>(initialTargetWeight);
  const [ratePercent, setRatePercent] = useState<number>(initialRate);

  useEffect(() => {
    if (profile) {
      setSelectedGoal(profile.goal_type);
      setTargetWeight(profile.target_weight_kg);
      setRatePercent(profile.weekly_rate_percent);
    }
  }, [profile]);

  // Adjust target weight
  const adjustTargetWeight = (delta: number) => {
    const nextVal = Math.round((targetWeight + delta) * 10) / 10;
    if (nextVal > 30 && nextVal < 250) {
      setTargetWeight(nextVal);
      onUpdateGoal({
        goal_type: selectedGoal,
        target_weight_kg: nextVal,
        weekly_rate_percent: ratePercent,
      });
    }
  };

  // Adjust rate
  const adjustRate = (delta: number) => {
    const sign = selectedGoal === 'muscle_gain' ? 1 : -1;
    const absRate = Math.abs(ratePercent);
    const nextAbs = Math.max(0.2, Math.min(1.5, Math.round((absRate + delta) * 100) / 100));
    const nextRate = sign * nextAbs;
    setRatePercent(nextRate);
    onUpdateGoal({
      goal_type: selectedGoal,
      target_weight_kg: targetWeight,
      weekly_rate_percent: nextRate,
    });
  };

  const handleGoalSelect = (goal: GoalType) => {
    setSelectedGoal(goal);
    let nextTarget = targetWeight;
    let nextRate = ratePercent;

    if (goal === 'maintenance') {
      nextTarget = currentWeight;
      nextRate = 0;
    } else if (goal === 'fat_loss') {
      if (nextTarget >= currentWeight) {
        nextTarget = Math.round((currentWeight - 4.0) * 10) / 10;
      }
      nextRate = -Math.abs(ratePercent || 0.75);
    } else if (goal === 'muscle_gain') {
      if (nextTarget <= currentWeight) {
        nextTarget = Math.round((currentWeight + 3.0) * 10) / 10;
      }
      nextRate = Math.abs(ratePercent || 0.35);
    }

    setTargetWeight(nextTarget);
    setRatePercent(nextRate);
    onUpdateGoal({
      goal_type: goal,
      target_weight_kg: nextTarget,
      weekly_rate_percent: nextRate,
    });
  };

  // Derived metrics
  const weightGap = Math.abs(targetWeight - currentWeight);
  const weeklyDeltaKg = selectedGoal === 'maintenance'
    ? 0
    : Math.round(currentWeight * (ratePercent / 100) * 100) / 100;

  const weeksToGoal = selectedGoal === 'maintenance' || Math.abs(weeklyDeltaKg) < 0.05
    ? 0
    : Math.round((weightGap / Math.abs(weeklyDeltaKg)) * 10) / 10;

  const rateAbs = Math.abs(ratePercent);
  const isSafeRate = rateAbs <= 0.85;
  const rateLabel = selectedGoal === 'maintenance'
    ? 'Equilibrium'
    : isSafeRate
    ? 'Recommended'
    : rateAbs <= 1.1
    ? 'Moderate'
    : 'Aggressive';

  const rateBadgeColor = selectedGoal === 'maintenance'
    ? colors.accentBlue
    : isSafeRate
    ? colors.accentGreen
    : rateAbs <= 1.1
    ? colors.accentYellow
    : colors.accentOrange;

  return (
    <View style={styles.card}>
      <View style={styles.topHeaderRow}>
        <View>
          <Text style={styles.cardSuperTitle}>STRATEGY GOAL</Text>
          <Text style={styles.cardTitle}>Goal & Trajectory</Text>
        </View>
        {loading && <ActivityIndicator size="small" color={colors.accentBlue} />}
      </View>

      {/* Goal Type Segment Pills */}
      <View style={styles.segmentContainer}>
        {GOAL_OPTIONS.map(opt => {
          const isSelected = selectedGoal === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
              onPress={() => handleGoalSelect(opt.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.segmentIcon}>{opt.icon}</Text>
              <Text
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Target Weight & Current Weight Display */}
      <View style={styles.weightRowContainer}>
        <View style={styles.weightBox}>
          <Text style={styles.weightBoxLabel}>CURRENT</Text>
          <Text style={styles.weightBoxValue}>{currentWeight.toFixed(1)} <Text style={styles.weightUnit}>kg</Text></Text>
        </View>

        <View style={styles.arrowContainer}>
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.gapText}>
            {selectedGoal === 'maintenance'
              ? 'Steady'
              : `${selectedGoal === 'fat_loss' ? '-' : '+'}${weightGap.toFixed(1)} kg`}
          </Text>
        </View>

        <View style={styles.weightBox}>
          <Text style={styles.weightBoxLabel}>TARGET</Text>
          {selectedGoal === 'maintenance' ? (
            <Text style={styles.weightBoxValue}>{currentWeight.toFixed(1)} <Text style={styles.weightUnit}>kg</Text></Text>
          ) : (
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => adjustTargetWeight(-0.5)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.weightBoxValue}>{targetWeight.toFixed(1)} <Text style={styles.weightUnit}>kg</Text></Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => adjustTargetWeight(0.5)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Rate of Progress Section (hidden for maintenance) */}
      {selectedGoal !== 'maintenance' && (
        <View style={styles.rateSection}>
          <View style={styles.rateHeaderRow}>
            <Text style={styles.rateSectionLabel}>WEEKLY RATE OF CHANGE</Text>
            <View style={[styles.rateBadge, { backgroundColor: rateBadgeColor + '22' }]}>
              <Text style={[styles.rateBadgeText, { color: rateBadgeColor }]}>
                {rateLabel}
              </Text>
            </View>
          </View>

          <View style={styles.rateControlRow}>
            <TouchableOpacity
              style={styles.rateStepBtn}
              onPress={() => adjustRate(-0.1)}
              activeOpacity={0.7}
            >
              <Text style={styles.rateStepBtnText}>−</Text>
            </TouchableOpacity>

            <View style={styles.rateDisplay}>
              <Text style={styles.ratePercentValue}>
                {Math.abs(ratePercent).toFixed(2)}%
                <Text style={styles.rateUnit}> / week</Text>
              </Text>
              <Text style={styles.rateKgDelta}>
                {weeklyDeltaKg >= 0 ? `+${weeklyDeltaKg.toFixed(2)}` : weeklyDeltaKg.toFixed(2)} kg / week
              </Text>
            </View>

            <TouchableOpacity
              style={styles.rateStepBtn}
              onPress={() => adjustRate(0.1)}
              activeOpacity={0.7}
            >
              <Text style={styles.rateStepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Prominent Estimated Arrival Date / ETA Banner */}
      <View style={styles.etaBanner}>
        <View style={styles.etaLeft}>
          <Text style={styles.etaIcon}>🗓️</Text>
          <View>
            <Text style={styles.etaLabel}>ESTIMATED ARRIVAL</Text>
            <Text style={styles.etaDate}>
              {selectedGoal === 'maintenance'
                ? 'Indefinite Lifestyle Protocol'
                : profile?.estimated_completion_date
                ? profile.estimated_completion_date
                : 'Recalculating...'}
            </Text>
          </View>
        </View>
        {selectedGoal !== 'maintenance' && weeksToGoal > 0 && (
          <View style={styles.weeksPill}>
            <Text style={styles.weeksPillText}>~{Math.round(weeksToGoal)} wks</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.0,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.textPrimary,
  },
  segmentIcon: {
    fontSize: 13,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textDark,
  },
  weightRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardHeader + '77',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  weightBox: {
    alignItems: 'center',
    flex: 1,
  },
  weightBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  weightBoxValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  weightUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  arrowText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  gapText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentBlue,
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  rateSection: {
    backgroundColor: colors.cardHeader + '44',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle + '44',
  },
  rateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rateSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  rateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rateControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateStepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rateDisplay: {
    alignItems: 'center',
  },
  ratePercentValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  rateUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  rateKgDelta: {
    fontSize: 12,
    color: colors.accentGreen,
    fontWeight: '700',
    marginTop: 2,
  },
  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 12,
  },
  etaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  etaIcon: {
    fontSize: 18,
  },
  etaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  etaDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  weeksPill: {
    backgroundColor: colors.accentBlue + '22',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  weeksPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentBlue,
  },
});
