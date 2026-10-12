import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { getSdkStatus, SdkAvailabilityStatus, requestPermission } from 'react-native-health-connect';
import { useSafeTopInset } from '../hooks/useSafeTopInset';
import { useTrainerStore } from '../store/useTrainerStore';
import { colors } from '../theme/colors';
import { TopFadeOverlay } from '../components/macrofactor/TopFadeOverlay';

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
  const { userProfile, saveProfile, refreshHealth } = useTrainerStore();
  const topInset = useSafeTopInset();

  const [weight, setWeight] = useState(String(userProfile.weight_kg ?? ''));
  const [height, setHeight] = useState(String(userProfile.height_cm ?? ''));
  const [age, setAge] = useState(String(userProfile.age ?? ''));
  const [activityLevel, setActivityLevel] = useState(userProfile.activity_level ?? 'Moderate');
  const [fitnessGoal, setFitnessGoal] = useState(userProfile.fitness_goal ?? 'hypertrophy');
  const [dietPref, setDietPref] = useState(userProfile.dietary_preference ?? 'omnivore');
  const [allergies, setAllergies] = useState((userProfile.allergies ?? []).join(', '));
  const [hcStatus, setHcStatus] = useState<string>('checking');

  React.useEffect(() => {
    getSdkStatus()
      .then(status => {
        setHcStatus(status === SdkAvailabilityStatus.SDK_AVAILABLE ? 'available' : 'unavailable');
      })
      .catch(() => setHcStatus('unavailable'));
  }, []);

  const handleSave = async () => {
    const allergyList = allergies
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    await saveProfile({
      ...userProfile,
      weight_kg: weight ? parseFloat(weight) : undefined,
      height_cm: height ? parseFloat(height) : undefined,
      age: age ? parseInt(age, 10) : undefined,
      activity_level: activityLevel,
      fitness_goal: fitnessGoal,
      dietary_preference: dietPref,
      allergies: allergyList,
    });
    Alert.alert('Profile Saved', 'Your anthropometrics and metabolic targets have been updated.');
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
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selected === opt.key && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <TopFadeOverlay />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Text style={styles.dateLabel}>SETTINGS & PREFERENCES</Text>
          <Text style={styles.pageTitle}>More</Text>
        </View>

        {/* Health Connect Status Card */}
        <View style={styles.hcCard}>
          <View style={styles.hcRow}>
            <Text style={styles.hcLabel}>Health Connect</Text>
            <View
              style={[
                styles.hcBadge,
                { backgroundColor: hcStatus === 'available' ? colors.accentGreen + '22' : colors.accentOrange + '22' },
              ]}
            >
              <Text
                style={[
                  styles.hcBadgeText,
                  { color: hcStatus === 'available' ? colors.accentGreen : colors.accentOrange },
                ]}
              >
                {hcStatus === 'available' ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </View>

          {hcStatus !== 'available' && (
            <TouchableOpacity style={styles.permBtn} onPress={handleRequestPermissions}>
              <Text style={styles.permBtnText}>Connect Health Connect</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Biometrics */}
        <SectionLabel label="Anthropometrics" />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="75"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="178"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="28"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Activity Level */}
        <SectionLabel label="Activity Level" />
        <ChipSelect
          options={ACTIVITY_LEVELS.map(a => ({ key: a.toLowerCase().replace(' ', '_'), label: a }))}
          selected={activityLevel.toLowerCase().replace(' ', '_')}
          onSelect={key => setActivityLevel(key)}
        />

        {/* Fitness Goal */}
        <SectionLabel label="Fitness Goal" />
        <ChipSelect
          options={FITNESS_GOALS}
          selected={fitnessGoal}
          onSelect={setFitnessGoal}
        />

        {/* Dietary Preference */}
        <SectionLabel label="Dietary Preference" />
        <ChipSelect
          options={DIETARY_PREFS}
          selected={dietPref}
          onSelect={setDietPref}
        />

        {/* Allergies */}
        <SectionLabel label="Allergies / Restrictions (comma-separated)" />
        <TextInput
          style={styles.input}
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. peanuts, dairy, gluten"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Save CTA */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appDark },
  scroll: { paddingHorizontal: 20, paddingBottom: 110 },
  header: { marginTop: 8, marginBottom: 16 },
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
  hcCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  hcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hcLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  hcBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  hcBadgeText: { fontSize: 12, fontWeight: '700' },
  permBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  permBtnText: { color: colors.accentBlue, fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  inputLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.textDark, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: { color: colors.textDark, fontSize: 15, fontWeight: '700' },
});
