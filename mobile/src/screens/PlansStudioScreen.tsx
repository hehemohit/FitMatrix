import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTrainerStore } from '../store/useTrainerStore';
import { StructuredPlanCard } from '../components/cards/StructuredPlanCard';

type PlanTab = 'workouts' | 'meals' | 'sleep';

const TABS: { key: PlanTab; label: string; emoji: string }[] = [
  { key: 'workouts', label: 'Workouts', emoji: '💪' },
  { key: 'meals', label: 'Meals', emoji: '🍽' },
  { key: 'sleep', label: 'Sleep', emoji: '🌙' },
];

const EmptyState: React.FC<{ type: string; onGenerate: () => void; loading: boolean }> = ({
  type,
  onGenerate,
  loading,
}) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>🤖</Text>
    <Text style={styles.emptyTitle}>No {type} plan yet</Text>
    <Text style={styles.emptySubtitle}>
      Ask your agent in the Chat tab, then tap Generate Plan — or generate directly below.
    </Text>
    <TouchableOpacity style={styles.generateBtn} onPress={onGenerate} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.generateBtnText}>✨ Generate {type} Plan</Text>
      )}
    </TouchableOpacity>
  </View>
);

export const PlansStudioScreen: React.FC = () => {
  const navigation = useNavigation();
  const { workoutPlan, dietPlan, sleepGoal, planLoading, generatePlan } = useTrainerStore();
  const [activeTab, setActiveTab] = useState<PlanTab>('workouts');

  const tabToType: Record<PlanTab, 'workout' | 'diet' | 'sleep'> = {
    workouts: 'workout',
    meals: 'diet',
    sleep: 'sleep',
  };

  const handleGenerate = async () => {
    const success = await generatePlan(tabToType[activeTab]);
    if (!success) {
      Alert.alert(
        'Plan Generation Failed',
        'Could not generate plan from backend. Make sure the backend server is running and reachable.'
      );
    }
  };

  const renderContent = () => {
    if (activeTab === 'workouts') {
      if (!workoutPlan) {
        return <EmptyState type="workout" onGenerate={handleGenerate} loading={planLoading} />;
      }
      return <StructuredPlanCard plan={workoutPlan} title="Weekly Training Plan" />;
    }
    if (activeTab === 'meals') {
      if (!dietPlan) {
        return <EmptyState type="diet" onGenerate={handleGenerate} loading={planLoading} />;
      }
      return <StructuredPlanCard plan={dietPlan} title="Daily Nutrition Plan" />;
    }
    if (!sleepGoal) {
      return <EmptyState type="sleep" onGenerate={handleGenerate} loading={planLoading} />;
    }
    return <StructuredPlanCard plan={sleepGoal} title="Sleep Protocol" />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Plan Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {planLoading && activeTab === tabToType[activeTab] ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#1a73e8" />
            <Text style={styles.loadingText}>Generating your plan…</Text>
          </View>
        ) : (
          renderContent()
        )}
      </ScrollView>

      {/* Regenerate button (shown when plan exists) */}
      {((activeTab === 'workouts' && workoutPlan) ||
        (activeTab === 'meals' && dietPlan) ||
        (activeTab === 'sleep' && sleepGoal)) && (
        <View style={styles.regenBar}>
          <TouchableOpacity style={styles.regenBtn} onPress={handleGenerate} disabled={planLoading}>
            <Text style={styles.regenBtnText}>🔄 Regenerate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate('Chat' as never)}
          >
            <Text style={styles.chatBtnText}>💬 Refine with Agent</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#1a73e8' },
  tabEmoji: { fontSize: 16 },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  activeTabLabel: { color: '#1a73e8' },
  scroll: { padding: 16, paddingBottom: 32 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  generateBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    elevation: 2,
  },
  generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loadingState: { alignItems: 'center', paddingTop: 80 },
  loadingText: { fontSize: 14, color: '#888', marginTop: 12 },
  regenBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  regenBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  regenBtnText: { color: '#1a73e8', fontSize: 13, fontWeight: '600' },
  chatBtn: {
    flex: 1,
    backgroundColor: '#e8f0fe',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  chatBtnText: { color: '#1a73e8', fontSize: 13, fontWeight: '600' },
});
