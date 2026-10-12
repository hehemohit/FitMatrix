import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { DayMacroTarget } from '../../types/schema';
import { AnimatedSegmentedControl, SegmentOption } from './AnimatedSegmentedControl';

interface MacroCyclingScheduleProps {
  useDayVariation: boolean;
  scheduleTargets: DayMacroTarget[];
  baselineCalories: number;
  baselineProtein: number;
  baselineCarbs: number;
  baselineFats: number;
  onToggleVariation: (enabled: boolean) => void;
  onUpdateSchedule: (newSchedule: DayMacroTarget[]) => void;
  loading?: boolean;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'MON',
  tue: 'TUE',
  wed: 'WED',
  thu: 'THU',
  fri: 'FRI',
  sat: 'SAT',
  sun: 'SUN',
};

const VARIATION_OPTIONS: SegmentOption<'equal' | 'cycling'>[] = [
  { key: 'equal', label: 'Equal', icon: '⚖️' },
  { key: 'cycling', label: 'Cycling', icon: '⚡' },
];

export const MacroCyclingSchedule: React.FC<MacroCyclingScheduleProps> = ({
  useDayVariation,
  scheduleTargets,
  baselineCalories,
  baselineProtein,
  baselineCarbs,
  baselineFats,
  onToggleVariation,
  onUpdateSchedule,
  loading = false,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Animated values for inspection card cross-fade and slide
  const inspectFadeAnim = useRef(new Animated.Value(1)).current;
  const inspectSlideAnim = useRef(new Animated.Value(0)).current;

  // Scale bounce animation for day pill tap
  const pillScaleAnim = useRef(new Animated.Value(1)).current;

  // Sync transition state when external loading changes
  useEffect(() => {
    if (!loading && isTransitioning) {
      setIsTransitioning(false);
    }
  }, [loading]);

  const isBusy = loading || isTransitioning;

  // Fallback 7-day schedule if empty
  const days: DayMacroTarget[] =
    scheduleTargets && scheduleTargets.length === 7
      ? scheduleTargets
      : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d, i) => ({
          day: d,
          is_training_day: [0, 1, 3, 4].includes(i),
          calories: baselineCalories,
          protein_g: baselineProtein,
          carbs_g: baselineCarbs,
          fats_g: baselineFats,
        }));

  const activeDay = days[selectedDayIndex] || days[0];

  const triggerInspectTransition = () => {
    inspectFadeAnim.setValue(0.3);
    inspectSlideAnim.setValue(4);
    Animated.parallel([
      Animated.timing(inspectFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(inspectSlideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSelectDay = (idx: number) => {
    if (isBusy) return;
    if (idx === selectedDayIndex) {
      if (useDayVariation) {
        handleToggleDayType(idx);
      }
      return;
    }

    Animated.sequence([
      Animated.timing(pillScaleAnim, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.spring(pillScaleAnim, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
    ]).start();

    setSelectedDayIndex(idx);
    triggerInspectTransition();
  };

  const handleToggleVariation = (mode: 'equal' | 'cycling') => {
    const nextEnabled = mode === 'cycling';
    if (nextEnabled === useDayVariation || isBusy) return;

    setIsTransitioning(true);
    triggerInspectTransition();
    onToggleVariation(nextEnabled);
  };

  const handleToggleDayType = (index: number) => {
    if (!useDayVariation || isBusy) return;

    setIsTransitioning(true);
    triggerInspectTransition();

    const nextDays = [...days];
    const targetDay = { ...nextDays[index] };
    const nextIsTraining = !targetDay.is_training_day;
    targetDay.is_training_day = nextIsTraining;
    nextDays[index] = targetDay;

    // Recalibrate 7-day budget
    const numTraining = nextDays.filter(d => d.is_training_day).length;
    const numRest = 7 - numTraining;

    const bonus = 250;
    const restDeduct = numRest > 0 ? Math.round((numTraining * bonus) / numRest) : 0;

    const recalibrated = nextDays.map(d => {
      if (d.is_training_day) {
        return {
          ...d,
          calories: baselineCalories + bonus,
          protein_g: baselineProtein,
          carbs_g: baselineCarbs + Math.round(bonus / 4),
          fats_g: baselineFats,
        };
      } else {
        return {
          ...d,
          calories: baselineCalories - restDeduct,
          protein_g: baselineProtein,
          carbs_g: Math.max(20, baselineCarbs - Math.round(restDeduct / 4)),
          fats_g: baselineFats,
        };
      }
    });

    onUpdateSchedule(recalibrated);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.superTitle}>CALORIE & MACRO DISTRIBUTION</Text>
          <Text style={styles.title}>Day-to-Day Cycling</Text>
        </View>

        {/* 2-Mode Hardware-Accelerated Sliding Pill Segmented Selector */}
        <AnimatedSegmentedControl
          options={VARIATION_OPTIONS}
          selectedKey={useDayVariation ? 'cycling' : 'equal'}
          onSelect={handleToggleVariation}
          disabled={isBusy}
          style={styles.variationSegmentedControl}
        />
      </View>

      <Text style={styles.sectionSubtitle}>
        {useDayVariation
          ? 'Training days receive +250 kcal in carbohydrates for glycogen replenishment. Tap any day to toggle Training vs Rest.'
          : 'Uniform daily targets maintained every day of the week for maximum nutritional simplicity.'}
      </Text>

      {/* 7-Day Pill Row */}
      <View style={styles.daysRow} pointerEvents={isBusy ? 'none' : 'auto'}>
        {days.map((item, idx) => {
          const isSelected = selectedDayIndex === idx;
          const label = DAY_LABELS[item.day.toLowerCase()] || item.day.toUpperCase();

          return (
            <TouchableOpacity
              key={item.day}
              style={[
                styles.dayPill,
                isSelected && styles.dayPillSelected,
                isBusy && styles.dayPillDisabled,
              ]}
              onPress={() => handleSelectDay(idx)}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                {label}
              </Text>

              {useDayVariation ? (
                <View
                  style={[
                    styles.trainingBadge,
                    {
                      backgroundColor: item.is_training_day
                        ? colors.accentGreen + '25'
                        : colors.cardHeader,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.trainingBadgeText,
                      {
                        color: item.is_training_day
                          ? colors.accentGreen
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {item.is_training_day ? 'TRAIN' : 'REST'}
                  </Text>
                </View>
              ) : (
                <View style={styles.dotIndicator} />
              )}

              <Text style={styles.dayCalsNumber}>
                {Math.round(item.calories)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Detailed Single Day Inspection Card with Smooth Animated Cross-Fade & Slide */}
      <Animated.View
        style={[
          styles.inspectionCard,
          {
            opacity: inspectFadeAnim,
            transform: [{ translateY: inspectSlideAnim }],
          },
        ]}
      >
        <View style={styles.inspectionHeader}>
          <Text style={styles.inspectionDayTitle}>
            {DAY_LABELS[activeDay.day.toLowerCase()]} TARGETS
          </Text>
          {useDayVariation && (
            <TouchableOpacity
              style={[styles.toggleDayTypeBtn, isBusy && styles.toggleDayTypeBtnDisabled]}
              onPress={() => handleToggleDayType(selectedDayIndex)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleDayTypeBtnText}>
                {activeDay.is_training_day ? '⚡ Training Day (+250 kcal)' : '🧘 Rest Day (-Carbs)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.macroMetricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>CALORIES</Text>
            <Text style={styles.metricVal}>{activeDay.calories} <Text style={styles.unitText}>kcal</Text></Text>
          </View>

          <View style={styles.metricBox}>
            <View style={styles.macroLabelWithDot}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentOrange }]} />
              <Text style={styles.metricLabel}>PROTEIN</Text>
            </View>
            <Text style={styles.metricVal}>{activeDay.protein_g} <Text style={styles.unitText}>g</Text></Text>
          </View>

          <View style={styles.metricBox}>
            <View style={styles.macroLabelWithDot}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentGreen }]} />
              <Text style={styles.metricLabel}>CARBS</Text>
            </View>
            <Text style={styles.metricVal}>{activeDay.carbs_g} <Text style={styles.unitText}>g</Text></Text>
          </View>

          <View style={styles.metricBox}>
            <View style={styles.macroLabelWithDot}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentYellow }]} />
              <Text style={styles.metricLabel}>FATS</Text>
            </View>
            <Text style={styles.metricVal}>{activeDay.fats_g} <Text style={styles.unitText}>g</Text></Text>
          </View>
        </View>
      </Animated.View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.0,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  variationSegmentedControl: {
    marginBottom: 0,
    width: 170,
    height: 38,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayPill: {
    alignItems: 'center',
    backgroundColor: colors.cardHeader + '66',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    flex: 1,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayPillSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.cardHeader,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  dayPillDisabled: {
    opacity: 0.7,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dayLabelSelected: {
    color: colors.textPrimary,
  },
  trainingBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  trainingBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentBlue,
    marginBottom: 8,
  },
  dayCalsNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inspectionCard: {
    backgroundColor: colors.cardHeader + '55',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle + '44',
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inspectionDayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  toggleDayTypeBtn: {
    backgroundColor: colors.cardHeader,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  toggleDayTypeBtnDisabled: {
    opacity: 0.5,
  },
  toggleDayTypeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentBlue,
  },
  macroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricBox: {
    alignItems: 'flex-start',
  },
  macroLabelWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  unitText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
