import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { getSdkStatus, SdkAvailabilityStatus, requestPermission } from 'react-native-health-connect';
import { useTrainerStore } from '../store/useTrainerStore';

const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'];
const FITNESS_GOALS = [
  { key: 'hypertrophy', label: '💪 Muscle Gain' },
  { key: 'fat_loss', label: '🔥 Fat Loss' },
  { key: 'strength', label: '🏋️ Strength' },
  { key: 'endurance', label: '🏃 Endurance' },
];
const DIETARY_PREFS = [
  { key: 'omnivore', label: '🍗 Omnivore' },
  { key: 'vegetarian', label: '🥗 Vegetarian' },
  { key: 'pure_vegetarian', label: '🌿 Pure Veg' },
  { key: 'vegan', label: '🌱 Vegan' },
  { key: 'keto', label: '🥑 Keto' },
];

export const ProfileScreen: React.FC = () => {
  const { userProfile, setUserProfile, refreshHealth } = useTrainerStore();

  const [weight, setWeight] = useState(String(userProfile.weight_kg ?? ''));
  const [height, setHeight] = useState(String(userProfile.height_cm ?? ''));
  const [age, setAge] = useState(String(userProfile.age ?? ''));
  const [activityLevel, setActivityLevel] = useState(userProfile.activity_level ?? 'Moderate');
  const [fitnessGoal, setFitnessGoal] = useState(userProfile.fitness_goal ?? '');
  const [dietPref, setDietPref] = useState(userProfile.dietary_preference ?? 'omnivore');
  const [allergies, setAllergies] = useState((userProfile.allergies ?? []).join(', '));
  const [hcStatus, setHcStatus] = useState<string>('checking');

  // Check HC status on mount
  React.useEffect(() => {
    getSdkStatus()
      .then(status => {
        setHcStatus(status === SdkAvailabilityStatus.SDK_AVAILABLE ? 'available' : 'unavailable');
      })
      .catch(() => setHcStatus('unavailable'));
  }, []);

  const handleSave = () => {
    const allergyList = allergies
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    setUserProfile({
      ...userProfile,
      weight_kg: weight ? parseFloat(weight) : undefined,
      height_cm: height ? parseFloat(height) : undefined,
      age: age ? parseInt(age, 10) : undefined,
      activity_level: activityLevel,
      fitness_goal: fitnessGoal,
      dietary_preference: dietPref,
      allergies: allergyList,
    });
    Alert.alert('Profile Saved', 'Your preferences will be applied to all agent responses.');
  };

  const handleRequestPermissions = async () => {
    try {
      await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'HeartRate' },
      ]);
      await refreshHealth();
      Alert.alert('Permissions Granted', 'Health data will now sync automatically.');
    } catch {
      Alert.alert('Permission Denied', 'You can grant access in your device Health Connect settings.');
    }
  };

  const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <Text style={styles.sectionLabel}>{label}</Text>
  );

  const ChipSelect: React.FC<{
    options: { key: string; label: string }[];
    selected: string;
    onSelect: (key: string) => void;
  }> = ({ options, selected, onSelect }) => (
    <View style={styles.chipRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.chip, selected === opt.key && styles.chipActive]}
          onPress={() => onSelect(opt.key)}
        >
          <Text style={[styles.chipText, selected === opt.key && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Profile & Settings</Text>

        {/* Health Connect Status */}
        <View style={styles.hcCard}>
          <View style={styles.hcRow}>
            <Text style={styles.hcLabel}>Health Connect</Text>
            <View style={[
              styles.hcBadge,
              { backgroundColor: hcStatus === 'available' ? '#e8f5e9' : '#fce4ec' },
            ]}>
              <Text style={[
                styles.hcBadgeText,
                { color: hcStatus === 'available' ? '#2e7d32' : '#c62828' },
              ]}>
                {hcStatus === 'available' ? '✓ Connected' : '✗ Unavailable'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.permBtn} onPress={handleRequestPermissions}>
            <Text style={styles.permBtnText}>Request Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* Biometrics */}
        <SectionLabel label="Biometrics" />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor="#ccc"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              placeholder="175"
              placeholderTextColor="#ccc"
            />
          </View>
        </View>
        <Text style={styles.inputLabel}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="25"
          placeholderTextColor="#ccc"
        />

        {/* Activity Level */}
        <SectionLabel label="Activity Level" />
        <ChipSelect
          options={ACTIVITY_LEVELS.map(l => ({ key: l, label: l }))}
          selected={activityLevel}
          onSelect={setActivityLevel}
        />

        {/* Fitness Goal */}
        <SectionLabel label="Fitness Goal" />
        <ChipSelect options={FITNESS_GOALS} selected={fitnessGoal} onSelect={setFitnessGoal} />

        {/* Dietary Preference */}
        <SectionLabel label="Dietary Preference" />
        <ChipSelect options={DIETARY_PREFS} selected={dietPref} onSelect={setDietPref} />

        {/* Allergies */}
        <SectionLabel label="Allergies / Intolerances (comma-separated)" />
        <TextInput
          style={styles.input}
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. peanuts, gluten"
          placeholderTextColor="#ccc"
        />

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 20 },
  hcCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    elevation: 1,
  },
  hcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  hcLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  hcBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  hcBadgeText: { fontSize: 12, fontWeight: '600' },
  permBtn: {
    borderWidth: 1,
    borderColor: '#1a73e8',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  permBtnText: { color: '#1a73e8', fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  inputLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    marginBottom: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
    elevation: 3,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
