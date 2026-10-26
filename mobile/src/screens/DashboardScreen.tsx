import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useDashboardTabStore } from '../store/useDashboardTabStore';
import { useSafeTopInset } from '../hooks/useSafeTopInset';
import { useTrainerStore } from '../store/useTrainerStore';
import { colors } from '../theme/colors';
import { CalorieArcGauge } from '../components/macrofactor/CalorieArcGauge';
import { MacroBreakdownBar } from '../components/macrofactor/MacroBreakdownBar';
import { SegmentPillToggle } from '../components/macrofactor/SegmentPillToggle';
import { HabitsSection } from '../components/macrofactor/HabitsSection';
import { AmbientCompanionCard } from '../components/macrofactor/AmbientCompanionCard';
import { TopFadeOverlay } from '../components/macrofactor/TopFadeOverlay';
import { MealEntryModal } from '../components/MealEntryModal';
import { WeighInModal } from '../components/macrofactor/WeighInModal';
import { useFitnessSync } from '../hooks/useFitnessSync';

export const DashboardScreen: React.FC = () => {
  // Automatic foreground and mount synchronization
  useFitnessSync();

  const {
    healthSnapshot,
    healthLoading,
    readinessLoading,
    coachState,
    userProfile,
    dailyLog,
    metabolicTargets,
    todayMeals,
    weighInHistory,
    weighInStat,
    foodLogHistory,
    foodLogStat,
    refreshHealth,
    logMeal,
    weighIn,
    syncTodayNutrition,
  } = useTrainerStore();

  const [mode, setMode] = useState<'consumed' | 'remaining'>('consumed');
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [weighInModalVisible, setWeighInModalVisible] = useState(false);

  const isInitializing = (healthLoading || readinessLoading) && healthSnapshot === null;
  const isRefreshing = healthLoading && healthSnapshot !== null;

  // Calorie & Macro calculations from metabolicTargets / userProfile / dailyLog
  const targetCalories = userProfile.target_calories || metabolicTargets.target_calories || 2400;
  const consumedCalories = dailyLog.calories_logged || 0;

  const targetProtein = userProfile.target_protein_g || metabolicTargets.target_protein_g || 160;
  const consumedProtein = dailyLog.protein_logged_g || 0;

  const targetFats = metabolicTargets.target_fats_g || 70;
  // Calculate fats from logged meals if available, otherwise estimate
  const consumedFats = todayMeals.reduce((acc, m) => acc + (m.fats_g || 0), 0);

  const targetCarbs = metabolicTargets.target_carbs_g || 250;
  const consumedCarbs = todayMeals.reduce((acc, m) => acc + (m.carbs_g || 0), 0);

  const sleepHours = healthSnapshot && healthSnapshot.sleepMinutes > 0
    ? (healthSnapshot.sleepMinutes / 60).toFixed(1)
    : '--';

  // Format today's date (e.g. "FRIDAY, NOVEMBER 15")
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  const topInset = useSafeTopInset();

  if (isInitializing) {
    return (
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
          <Text style={styles.loaderLabel}>Syncing Biometrics…</Text>
          <Text style={styles.loaderSub}>Connecting to Health Connect</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <TopFadeOverlay />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              refreshHealth();
              syncTodayNutrition();
            }}
            tintColor={colors.accentBlue}
            progressViewOffset={topInset}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleGroup}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.dateLabel}>{formattedDate}</Text>
              <Text style={styles.pageTitle}>Dashboard</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.switchDashboardBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => useDashboardTabStore.getState().setActiveDashboard('workout')}
            activeOpacity={0.8}
          >
            <Text style={styles.switchDashboardIcon}>🏋️</Text>
            <Text style={styles.switchDashboardText}>Workout</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Nutrition Section */}
        <View style={styles.nutritionSection}>
          <Text style={styles.sectionHeading}>Daily Nutrition</Text>

          {/* Circular Calorie Arc Gauge */}
          <CalorieArcGauge
            consumed={consumedCalories}
            target={targetCalories}
            mode={mode}
            onToggleMode={() => setMode(m => (m === 'consumed' ? 'remaining' : 'consumed'))}
          />

          {/* Macronutrient Bars Breakdown */}
          <MacroBreakdownBar
            proteinLogged={consumedProtein}
            proteinTarget={targetProtein}
            fatsLogged={consumedFats}
            fatsTarget={targetFats}
            carbsLogged={consumedCarbs}
            carbsTarget={targetCarbs}
            mode={mode}
          />

          {/* Consumed / Remaining Toggle Pill */}
          <SegmentPillToggle
            value={mode}
            onChange={setMode}
          />
        </View>

        {/* Habits Consistency Section (Weigh-In & Food Logging) */}
        <HabitsSection
          weighInHistory={weighInHistory}
          weighInStat={weighInStat}
          foodLogHistory={foodLogHistory}
          foodLogStat={foodLogStat}
          onWeighInPress={() => setWeighInModalVisible(true)}
          onFoodLogPress={() => setMealModalVisible(true)}
        />

        {/* Ambient Companion Recovery Card */}
        <AmbientCompanionCard
          readinessScore={coachState.readiness_score}
          fatigueFlag={coachState.fatigue_flag}
          prescribedWorkout={coachState.prescribed_workout}
          sleepHours={sleepHours}
          stepsToday={healthSnapshot?.steps}
          restingHeartRate={healthSnapshot?.restingHeartRateBpm}
        />
      </ScrollView>

      {/* Quick Meal Entry Modal */}
      <MealEntryModal
        visible={mealModalVisible}
        onClose={() => setMealModalVisible(false)}
        onLog={logMeal}
      />

      {/* Daily Weigh-In Modal */}
      <WeighInModal
        visible={weighInModalVisible}
        onClose={() => setWeighInModalVisible(false)}
        onSave={weighIn}
        initialWeight={userProfile.weight_kg}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.appDark, // #121213
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loaderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
  },
  loaderSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerRow: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  switchDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2333',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2b3f63',
    marginBottom: 4,
  },
  switchDashboardIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  switchDashboardText: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary, // #808288
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary, // #ffffff
    letterSpacing: -0.8,
    marginTop: 2,
  },
  nutritionSection: {
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
});
