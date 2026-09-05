import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnyPlan, isWorkoutPlan, isDietPlan, isSleepGoal, WorkoutPlan, DietPlan, SleepGoal } from '../../types/plans';
import { WorkoutCard } from './WorkoutCard';

// ─── Diet Plan View ───────────────────────────────────────────────────────────

const DietPlanView: React.FC<{ plan: DietPlan }> = ({ plan }) => (
  <View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Daily Calories</Text>
      <Text style={styles.summaryValue}>{plan.dailyCalories} kcal</Text>
    </View>
    <View style={styles.macroRow}>
      <MacroPill label="P" value={plan.macroSplit.proteinG} colour="#4CAF50" />
      <MacroPill label="C" value={plan.macroSplit.carbsG} colour="#FF9800" />
      <MacroPill label="F" value={plan.macroSplit.fatsG} colour="#E91E63" />
    </View>
    {(plan.meals ?? []).map((meal, idx) => (
      <View key={idx} style={styles.mealRow}>
        <Text style={styles.mealTime}>{meal.time}</Text>
        <Text style={styles.mealDesc}>{meal.description}</Text>
        <Text style={styles.mealCal}>{meal.calories} kcal</Text>
      </View>
    ))}
    <Text style={styles.hydration}>
      💧 Hydration target: {plan.hydrationLiters}L
    </Text>
  </View>
);

const MacroPill: React.FC<{ label: string; value: number; colour: string }> = ({ label, value, colour }) => (
  <View style={[styles.pill, { borderColor: colour }]}>
    <Text style={[styles.pillLabel, { color: colour }]}>{label}</Text>
    <Text style={styles.pillValue}>{value}g</Text>
  </View>
);

// ─── Sleep Goal View ──────────────────────────────────────────────────────────

const SleepGoalView: React.FC<{ goal: SleepGoal }> = ({ goal }) => (
  <View>
    <View style={styles.sleepRow}>
      <Text style={styles.sleepTime}>🌙 Bedtime</Text>
      <Text style={styles.sleepValue}>{goal.targetBedtime}</Text>
    </View>
    <View style={styles.sleepRow}>
      <Text style={styles.sleepTime}>☀️ Wake</Text>
      <Text style={styles.sleepValue}>{goal.targetWakeTime}</Text>
    </View>
    <View style={styles.sleepRow}>
      <Text style={styles.sleepTime}>⏱ Duration</Text>
      <Text style={styles.sleepValue}>{goal.targetDurationHours}h</Text>
    </View>
    <Text style={styles.milestoneHeader}>Wind-down routine</Text>
    {(goal.windDownMilestones ?? []).map((m: string, idx: number) => (
      <Text key={idx} style={styles.milestone}>• {m}</Text>
    ))}
    <Text style={styles.threshold}>
      Recovery threshold: {goal.recoveryScoreThreshold}/100
    </Text>
  </View>
);

// ─── StructuredPlanCard ────────────────────────────────────────────────────────

interface StructuredPlanCardProps {
  plan: AnyPlan;
  title?: string;
}

export const StructuredPlanCard: React.FC<StructuredPlanCardProps> = ({ plan, title }) => {
  const renderContent = () => {
    if (isWorkoutPlan(plan)) {
      return ((plan as WorkoutPlan).days ?? []).map((day, idx) => (
        <WorkoutCard key={idx} day={day} />
      ));
    }
    if (isDietPlan(plan)) {
      return <DietPlanView plan={plan as DietPlan} />;
    }
    if (isSleepGoal(plan)) {
      return <SleepGoalView goal={plan as SleepGoal} />;
    }
    return <Text style={styles.unknown}>Unknown plan type.</Text>;
  };

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.generatedAt}>
        Generated {new Date(plan.generatedAt).toLocaleDateString()}
      </Text>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  generatedAt: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 12,
  },
  unknown: { color: '#999', fontStyle: 'italic' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, color: '#555' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111' },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  pillLabel: { fontSize: 11, fontWeight: '700' },
  pillValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  mealTime: { fontSize: 12, color: '#888', width: 80 },
  mealDesc: { flex: 1, fontSize: 13, color: '#333', marginHorizontal: 8 },
  mealCal: { fontSize: 12, fontWeight: '600', color: '#1a73e8' },
  hydration: { fontSize: 12, color: '#666', marginTop: 12 },
  sleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  sleepTime: { fontSize: 14, color: '#555' },
  sleepValue: { fontSize: 14, fontWeight: '700', color: '#111' },
  milestoneHeader: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 4 },
  milestone: { fontSize: 13, color: '#555', lineHeight: 22 },
  threshold: { fontSize: 12, color: '#888', marginTop: 10 },
});
