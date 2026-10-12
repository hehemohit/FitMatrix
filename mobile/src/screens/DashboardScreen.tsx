import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTrainerStore } from '../store/useTrainerStore';
import { MetricTile } from '../components/cards/MetricTile';
import { ReadinessCard } from '../components/ReadinessCard';
import { MacroCard } from '../components/MacroCard';
import { MealEntryModal } from '../components/MealEntryModal';

export const DashboardScreen: React.FC = () => {
  const {
    healthSnapshot,
    healthLoading,
    readinessLoading,
    coachState,
    userProfile,
    dailyLog,
    todayMeals,
    syncHealth,
    refreshHealth,
    logMeal,
    syncTodayNutrition,
  } = useTrainerStore();

  const [mealModalVisible, setMealModalVisible] = useState(false);

  useEffect(() => {
    syncHealth();
    syncTodayNutrition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInitializing = (healthLoading || readinessLoading) && healthSnapshot === null;
  const isRefreshing = healthLoading && healthSnapshot !== null;
  const hasRealReadiness = coachState.readiness_score != null;

  const sleepHours = healthSnapshot && healthSnapshot.sleepMinutes > 0
    ? (healthSnapshot.sleepMinutes / 60).toFixed(1)
    : '--';

  // ── Loading Skeleton (first launch) ──────────────────────────────────────────
  if (isInitializing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.loaderLabel}>Syncing Health Data…</Text>
          <Text style={styles.loaderSub}>Connecting to Health Connect</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              refreshHealth();
              syncTodayNutrition();
            }}
            tintColor="#1a73e8"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.subtitle}>
            {hasRealReadiness ? 'Live data from Health Connect' : 'Pull to sync your Health data'}
          </Text>
        </View>

        {/* Readiness — show spinner overlay while recomputing */}
        <View>
          <ReadinessCard
            score={coachState.readiness_score ?? 0}
            fatigueFlag={coachState.fatigue_flag}
            prescribedWorkout={coachState.prescribed_workout}
          />
          {readinessLoading && (
            <View style={styles.readinessOverlay}>
              <ActivityIndicator size="small" color="#1a73e8" />
              <Text style={styles.overlayText}>Computing readiness…</Text>
            </View>
          )}
        </View>

        {/* Metric Grid */}
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.metricGrid}>
          <MetricTile
            label="Steps"
            value={healthSnapshot?.steps?.toLocaleString() ?? '--'}
            icon="👟"
            accent="#1a73e8"
          />
          <MetricTile
            label="Active Cal"
            value={healthSnapshot?.activeCaloriesBurned ?? '--'}
            unit="kcal"
            icon="🔥"
            accent="#EA4335"
          />
        </View>
        <View style={styles.metricGrid}>
          <MetricTile
            label="Resting HR"
            value={healthSnapshot?.restingHeartRateBpm || '--'}
            unit={healthSnapshot?.restingHeartRateBpm ? 'bpm' : ''}
            icon="❤️"
            accent="#E91E63"
          />
          <MetricTile
            label="Sleep"
            value={sleepHours}
            unit={sleepHours !== '--' ? 'hrs' : ''}
            icon="🌙"
            accent="#9C27B0"
          />
        </View>

        {/* Macros */}
        <Text style={styles.sectionTitle}>Nutrition</Text>
        <MacroCard
          caloriesLogged={dailyLog.calories_logged ?? 0}
          proteinLogged={dailyLog.protein_logged_g ?? 0}
          proteinTarget={userProfile.target_protein_g ?? 160}
          caloriesTarget={userProfile.target_calories ?? 2400}
          onLogMealPress={() => setMealModalVisible(true)}
        />

        {/* Today's Meals Timeline */}
        <View style={styles.mealsCard}>
          <View style={styles.mealsHeader}>
            <Text style={styles.mealsTitle}>Today's Meals</Text>
            <Text style={styles.mealsCount}>{todayMeals.length} logged</Text>
          </View>
          {todayMeals.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyMeals}
              onPress={() => setMealModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyMealsEmoji}>🍽️</Text>
              <Text style={styles.emptyMealsText}>No meals logged yet today</Text>
              <Text style={styles.emptyMealsSub}>Tap "+ Log Meal" above or tap here to start</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.mealsList}>
              {todayMeals.map((meal, idx) => (
                <View key={meal.meal_id || `meal_${idx}`} style={styles.mealRow}>
                  <View style={styles.mealLeft}>
                    <Text style={styles.mealCategory}>{meal.category} · {meal.time || 'Today'}</Text>
                    <Text style={styles.mealName}>{meal.name}</Text>
                  </View>
                  <View style={styles.mealRight}>
                    <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                    <Text style={styles.mealProtein}>{meal.protein_g}g P</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Data source badge */}
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceDot}>●</Text>
          <Text style={styles.sourceText}>
            {healthSnapshot
              ? `Live · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'No Health Connect data — using defaults'}
          </Text>
        </View>

        {/* Goal badge */}
        {userProfile.fitness_goal && (
          <View style={styles.goalBadge}>
            <Text style={styles.goalLabel}>ACTIVE GOAL</Text>
            <Text style={styles.goalText}>
              {userProfile.fitness_goal.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        )}

        {/* Sync button */}
        <TouchableOpacity style={styles.syncBtn} onPress={refreshHealth}>
          <Text style={styles.syncBtnText}>🔄 Sync Health Data</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quick Meal Entry Modal */}
      <MealEntryModal
        visible={mealModalVisible}
        onClose={() => setMealModalVisible(false)}
        onLog={logMeal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 32 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 12 },
  loaderSub: { fontSize: 12, color: '#aaa' },
  header: { marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  readinessOverlay: {
    position: 'absolute',
    top: 8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffffcc',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overlayText: { fontSize: 11, color: '#1a73e8', fontWeight: '600' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  metricGrid: { flexDirection: 'row', marginBottom: 4 },
  mealsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 12,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  mealsCount: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  emptyMeals: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#f9fbfd',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8f0fe',
    borderStyle: 'dashed',
  },
  emptyMealsEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyMealsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  emptyMealsSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  mealsList: {
    gap: 10,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  mealLeft: {
    flex: 1,
  },
  mealCategory: {
    fontSize: 11,
    color: '#1a73e8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mealName: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
    marginTop: 2,
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealCalories: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  mealProtein: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 1,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  sourceDot: {
    fontSize: 8,
    color: '#34A853',
  },
  sourceText: {
    fontSize: 11,
    color: '#aaa',
  },
  goalBadge: {
    backgroundColor: '#e8f0fe',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a73e8',
    letterSpacing: 0.8,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },
  syncBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 1,
  },
  syncBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
});
