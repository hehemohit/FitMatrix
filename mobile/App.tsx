import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { syncHealthConnectData, HealthSnapshot } from './src/services/healthService';
import { sendBiometricsAndMessage } from './src/api/coachApi';
import { CoachResponse } from './src/types/schema';

export default function App() {
  const [healthData, setHealthData] = useState<HealthSnapshot>({
    steps: 0,
    sleepMinutes: 420,
    workouts: [],
  });
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'coach'; text: string }>>([
    { sender: 'coach', text: 'FitMatrix initialized. How can I guide your training today?' },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [coachState, setCoachState] = useState<Partial<CoachResponse>>({
    readiness_score: 80,
    fatigue_flag: 'nominal',
    prescribed_workout: 'Awaiting prompt...',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      syncHealthConnectData()
        .then(setHealthData)
        .catch(err => console.log('Sync err:', err));
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userPrompt = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { sender: 'user', text: userPrompt }]);
    setLoading(true);

    try {
      const res = await sendBiometricsAndMessage({
        user_id: 'usr_dev_1',
        message: userPrompt,
        steps_today: healthData.steps,
        sleep_minutes: healthData.sleepMinutes,
        logged_workouts: healthData.workouts,
      });

      setCoachState({
        readiness_score: res.readiness_score,
        fatigue_flag: res.fatigue_flag,
        prescribed_workout: res.prescribed_workout,
      });

      setMessages(prev => [...prev, { sender: 'coach', text: res.reply }]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { sender: 'coach', text: 'Error connecting to FitMatrix agent backend.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FitMatrix</Text>
        <Text style={styles.headerSubtitle}>Multi-Agent Autonomous Coach</Text>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Readiness</Text>
          <Text style={styles.cardValue}>{coachState.readiness_score ?? '--'}/100</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Steps</Text>
          <Text style={styles.cardValue}>{healthData.steps}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sleep</Text>
          <Text style={styles.cardValue}>
            {Math.round(healthData.sleepMinutes / 60)}h {healthData.sleepMinutes % 60}m
          </Text>
        </View>
      </View>

      {coachState.prescribed_workout && (
        <View style={styles.planBanner}>
          <Text style={styles.planLabel}>Prescribed Focus:</Text>
          <Text style={styles.planText}>{coachState.prescribed_workout}</Text>
        </View>
      )}

      <ScrollView style={styles.chatArea}>
        {messages.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.bubble,
              m.sender === 'user' ? styles.userBubble : styles.coachBubble,
            ]}>
            <Text style={m.sender === 'user' ? styles.userText : styles.coachText}>
              {m.text}
            </Text>
          </View>
        ))}
        {loading && <ActivityIndicator size="small" color="#1a73e8" style={{ marginVertical: 8 }} />}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask workout or diet advice..."
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a73e8' },
  headerSubtitle: { fontSize: 12, color: '#666' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  card: { flex: 1, backgroundColor: '#fff', margin: 4, padding: 12, borderRadius: 8, elevation: 1 },
  cardLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase' },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#111', marginTop: 4 },
  planBanner: { backgroundColor: '#e8f0fe', padding: 12, marginHorizontal: 16, borderRadius: 8 },
  planLabel: { fontSize: 11, fontWeight: 'bold', color: '#1a73e8' },
  planText: { fontSize: 13, color: '#333', marginTop: 2 },
  chatArea: { flex: 1, padding: 16 },
  bubble: { padding: 12, borderRadius: 10, marginBottom: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1a73e8' },
  coachBubble: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#eee' },
  userText: { color: '#ffffff', fontSize: 14 },
  coachText: { color: '#111111', fontSize: 14 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#ffffff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, height: 40 },
  sendButton: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, marginLeft: 8, backgroundColor: '#1a73e8', borderRadius: 20 },
  sendButtonText: { color: '#ffffff', fontWeight: 'bold' },
});