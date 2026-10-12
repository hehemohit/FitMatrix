import React, { useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeTopInset } from '../hooks/useSafeTopInset';
import { useTrainerStore } from '../store/useTrainerStore';
import { colors } from '../theme/colors';
import { TopFadeOverlay } from '../components/macrofactor/TopFadeOverlay';
import { GoalEtaCard } from '../components/strategy/GoalEtaCard';
import { CoachingModeSelector } from '../components/strategy/CoachingModeSelector';
import { MacroPresetSelector } from '../components/strategy/MacroPresetSelector';
import { MacroCyclingSchedule } from '../components/strategy/MacroCyclingSchedule';
import { WeeklyCheckInModal } from '../components/strategy/WeeklyCheckInModal';

export const StrategyScreen: React.FC = () => {
  const topInset = useSafeTopInset();

  const {
    strategyProfile,
    strategyLoading,
    checkInLoading,
    lastCheckInResult,
    checkInModalVisible,
    fetchStrategyProfile,
    updateGoal,
    setCoachingMode,
    setDietStyle,
    setScheduleTargets,
    runWeeklyCheckIn,
    setCheckInModalVisible,
  } = useTrainerStore();

  useEffect(() => {
    fetchStrategyProfile();
  }, [fetchStrategyProfile]);

  const tdee = strategyProfile?.current_expenditure_tdee ?? 2640;
  const trendDelta = strategyProfile?.expenditure_trend_delta ?? 65;
  const targetCals = strategyProfile?.target_calories ?? 2400;
  const targetProtein = strategyProfile?.target_protein_g ?? 160;
  const targetCarbs = strategyProfile?.target_carbs_g ?? 250;
  const targetFats = strategyProfile?.target_fats_g ?? 70;

  const history = strategyProfile?.expenditure_history_14d ?? [
    2520, 2530, 2550, 2570, 2560, 2580, 2600, 2610, 2590, 2620, 2635, 2640, 2645, 2640
  ];

  // Scale 14-day history for mini bar chart
  const minExp = Math.min(...history);
  const maxExp = Math.max(...history);
  const expRange = Math.max(1, maxExp - minExp);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <TopFadeOverlay />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateLabel}>MACRO STRATEGY</Text>
            <Text style={styles.pageTitle}>Strategy</Text>
          </View>

          <TouchableOpacity
            style={styles.headerCheckInBtn}
            onPress={() => runWeeklyCheckIn()}
            disabled={checkInLoading}
            activeOpacity={0.8}
          >
            {checkInLoading ? (
              <ActivityIndicator size="small" color={colors.textDark} />
            ) : (
              <Text style={styles.headerCheckInText}>✨ Check-In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 1. Expenditure Trend Card */}
        <View style={styles.expenditureCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardSubtitle}>TRUE EXPENDITURE</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>+{trendDelta} kcal / wk</Text>
            </View>
          </View>

          <Text style={styles.expenditureVal}>
            {tdee.toLocaleString()} <Text style={styles.kcalUnit}>kcal/day</Text>
          </Text>
          <Text style={styles.expenditureDesc}>
            Calculated dynamically from your logged energy intake and scale weigh-in trends over 14 days.
          </Text>

          {/* 14-Day Visual Mini Bar Chart */}
          <View style={styles.chartBarRow}>
            {history.map((val, i) => {
              const normalizedHeight = 24 + ((val - minExp) / expRange) * 50;
              const isLatest = i === history.length - 1;
              return (
                <View
                  key={i}
                  style={[
                    styles.chartBar,
                    {
                      height: normalizedHeight,
                      backgroundColor: isLatest ? colors.accentGreen : colors.accentBlue,
                      opacity: isLatest ? 1.0 : 0.65 + (i / history.length) * 0.35,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* 2. Goal & Dynamic ETA Calculator */}
        <GoalEtaCard
          profile={strategyProfile}
          onUpdateGoal={params => {
            updateGoal({
              goal_type: params.goal_type,
              target_weight_kg: params.target_weight_kg,
              weekly_rate_percent: params.weekly_rate_percent,
              current_weight_kg: strategyProfile?.current_weight_kg,
              starting_weight_kg: strategyProfile?.starting_weight_kg,
            });
          }}
          loading={strategyLoading}
        />

        {/* 3. Coaching Mode Selector */}
        <CoachingModeSelector
          currentMode={strategyProfile?.coaching_mode ?? 'coached'}
          onSelectMode={mode => setCoachingMode(mode)}
        />

        {/* 4. Macro Program Customization (Diet Style & Protein Density) */}
        <MacroPresetSelector
          currentDietStyle={strategyProfile?.diet_style ?? 'balanced'}
          currentProteinPref={strategyProfile?.protein_preference ?? 'moderate'}
          onSelectDietStyle={style => {
            setDietStyle({
              diet_style: style,
              protein_preference: strategyProfile?.protein_preference,
              use_day_variation: strategyProfile?.use_day_variation,
            });
          }}
          onSelectProteinPref={pref => {
            setDietStyle({
              diet_style: strategyProfile?.diet_style ?? 'balanced',
              protein_preference: pref,
              use_day_variation: strategyProfile?.use_day_variation,
            });
          }}
        />

        {/* 5. Day-to-Day Variation (Macro Cycling) */}
        <MacroCyclingSchedule
          useDayVariation={strategyProfile?.use_day_variation ?? false}
          scheduleTargets={strategyProfile?.schedule_targets ?? []}
          baselineCalories={targetCals}
          baselineProtein={targetProtein}
          baselineCarbs={targetCarbs}
          baselineFats={targetFats}
          onToggleVariation={enabled => {
            setDietStyle({
              diet_style: strategyProfile?.diet_style ?? 'balanced',
              protein_preference: strategyProfile?.protein_preference,
              use_day_variation: enabled,
            });
          }}
          onUpdateSchedule={newSched => {
            setScheduleTargets(newSched);
          }}
        />

        {/* 6. Program Targets Summary Card */}
        <View style={styles.targetsCard}>
          <Text style={styles.targetsTitle}>Program Targets Summary</Text>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Baseline Calories</Text>
            <Text style={styles.targetValue}>{targetCals} kcal</Text>
          </View>
          <View style={styles.targetRow}>
            <View style={styles.macroTagRow}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentOrange }]} />
              <Text style={styles.targetLabel}>Protein</Text>
            </View>
            <Text style={styles.targetValue}>{targetProtein}g</Text>
          </View>
          <View style={styles.targetRow}>
            <View style={styles.macroTagRow}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentGreen }]} />
              <Text style={styles.targetLabel}>Carbohydrates</Text>
            </View>
            <Text style={styles.targetValue}>{targetCarbs}g</Text>
          </View>
          <View style={styles.targetRow}>
            <View style={styles.macroTagRow}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentYellow }]} />
              <Text style={styles.targetLabel}>Fats</Text>
            </View>
            <Text style={styles.targetValue}>{targetFats}g</Text>
          </View>
        </View>

        {/* Weekly Companion Check-In Banner */}
        <View style={styles.checkInCard}>
          <View style={styles.checkInHeader}>
            <Text style={styles.checkInSparkle}>✨</Text>
            <Text style={styles.checkInTitle}>Weekly Companion Check-In</Text>
          </View>
          <Text style={styles.checkInBody}>
            MacroFactor's adherence-neutral algorithm continuously reviews your true metabolic expenditure to prevent plateauing. Run your weekly check-in to keep targets aligned.
          </Text>
          <TouchableOpacity
            style={styles.checkInBtn}
            onPress={() => runWeeklyCheckIn()}
            disabled={checkInLoading}
            activeOpacity={0.8}
          >
            {checkInLoading ? (
              <ActivityIndicator size="small" color={colors.textDark} />
            ) : (
              <Text style={styles.checkInBtnText}>Recalibrate Weekly Targets</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Weekly Check-in Review Modal */}
      <WeeklyCheckInModal
        visible={checkInModalVisible}
        result={lastCheckInResult}
        onClose={() => setCheckInModalVisible(false)}
        onAccept={() => setCheckInModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.appDark,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  headerCheckInBtn: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerCheckInText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textDark,
  },
  expenditureCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.0,
  },
  trendBadge: {
    backgroundColor: colors.accentGreen + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentGreen,
  },
  expenditureVal: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  kcalUnit: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  expenditureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  chartBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 76,
    paddingTop: 8,
  },
  chartBar: {
    width: 14,
    borderRadius: 4,
  },
  checkInCard: {
    backgroundColor: colors.cardHeader,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  checkInSparkle: {
    fontSize: 14,
  },
  checkInTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkInBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  checkInBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  targetsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 16,
  },
  targetsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardHeader,
  },
  macroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  targetLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
