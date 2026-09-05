import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTrainerStore } from '../store/useTrainerStore';
import { ChatView } from '../components/ChatView';

type AgentMode = 'workout' | 'diet' | 'sleep';

const AGENT_TABS: { key: AgentMode; label: string; emoji: string }[] = [
  { key: 'workout', label: 'Workout', emoji: '🏋️' },
  { key: 'diet', label: 'Diet', emoji: '🥗' },
  { key: 'sleep', label: 'Sleep', emoji: '😴' },
];

export const AgentChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const { messages, loading, planLoading, sendMessage, generatePlan } = useTrainerStore();
  const [activeTab, setActiveTab] = useState<AgentMode>('workout');

  const handleGeneratePlan = async () => {
    await generatePlan(activeTab);
    // Navigate to Plan Studio after plan is generated
    navigation.navigate('Plans' as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Agent Workspace Tabs */}
      <View style={styles.tabBar}>
        {AGENT_TABS.map(tab => (
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

      {/* Chat Area */}
      <ChatView
        messages={messages}
        loading={loading}
        onSend={sendMessage}
        placeholder={`Ask your ${activeTab} agent...`}
      />

      {/* Generate Plan CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={[styles.ctaButton, planLoading && styles.ctaDisabled]}
          onPress={handleGeneratePlan}
          disabled={planLoading}
          activeOpacity={0.85}
        >
          {planLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              ✨ Generate {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Plan
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  activeTab: {
    borderBottomColor: '#1a73e8',
  },
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
  ctaBar: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ctaButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  ctaDisabled: { backgroundColor: '#b0c8f9' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
