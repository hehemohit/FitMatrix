import React, { useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useTrainerStore } from '../store/useTrainerStore';
import { MetricTile } from '../components/cards/MetricTile';
import { ReadinessCard } from '../components/ReadinessCard';
import { MacroCard } from '../components/MacroCard';

export const DashboardScreen: React.FC = () => {
  const {
    healthSnapshot,
    healthLoading,
    coachState,
    userProfile,
    dailyLog,
    syncHealth,
    refreshHealth,
  } = useTrainerStore();

  useEffect(() => {
    syncHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sleepHours = healthSnapshot
    ? (healthSnapshot.sleepMinutes / 60).toFixed(1)
    : '--';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={healthLoading} onRefresh={refreshHealth} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.subtitle}>Here's your FitMatrix overview</Text>
        </View>

        {/* Readiness */}
        <ReadinessCard
          score={coachState.readiness_score ?? 80}
          fatigueFlag={coachState.fatigue_flag}
          prescribedWorkout={coachState.prescribed_workout}
        />

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
            unit="bpm"
            icon="❤️"
            accent="#E91E63"
          />
          <MetricTile
            label="Sleep"
            value={sleepHours}
            unit="hrs"
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
        />

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2 },
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
