import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';

const TOTAL_STEPS = 6;

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const OnboardingWizardScreen: React.FC = () => {
  const topInset = useSafeTopInset();
  const { user, submitOnboarding, loading } = useAuthStore();

  const [step, setStep] = useState(0);

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || 'Athlete');
  const [goalType, setGoalType] = useState<'fat_loss' | 'maintenance' | 'muscle_gain'>('fat_loss');
  const [currentWeight, setCurrentWeight] = useState(78.4);
  const [targetWeight, setTargetWeight] = useState(74.0);
  const [ratePercent, setRatePercent] = useState(-0.75);

  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState(26);
  const [heightCm, setHeightCm] = useState(178);

  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  >('moderate');
  const [trainingDays, setTrainingDays] = useState<string[]>(['mon', 'tue', 'thu', 'fri']);

  const [dietStyle, setDietStyle] = useState<
    'balanced' | 'low_carb' | 'keto' | 'high_protein'
  >('balanced');
  const [proteinPref, setProteinPref] = useState<'low' | 'moderate' | 'high'>('moderate');

  // Calibration reveal metrics
  const [calibratedData, setCalibratedData] = useState<any>(null);

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else if (step === 4) {
      // Step 4 -> 5 is calibration execution
      setStep(5);
      const ok = await submitOnboarding({
        full_name: fullName.trim() || 'Athlete',
        age,
        sex,
        height_cm: heightCm,
        current_weight_kg: currentWeight,
        goal_type: goalType,
        target_weight_kg: targetWeight,
        weekly_rate_percent: ratePercent,
        activity_level: activityLevel,
        diet_style: dietStyle,
        protein_preference: proteinPref,
        training_days: trainingDays,
      });
      if (ok) {
        // Compute preview numbers for instant display
        const s = sex === 'male' ? 5 : -161;
        const bmr = Math.round(10 * currentWeight + 6.25 * heightCm - 5 * age + s);
        const mult = activityLevel === 'sedentary' ? 1.2 : activityLevel === 'light' ? 1.375 : 1.55;
        const tdee = Math.round(bmr * mult);
        const delta = Math.round((currentWeight * (ratePercent / 100) * 7700) / 7);
        const cals = Math.max(1200, tdee + delta);

        setCalibratedData({
          bmr,
          tdee,
          cals,
          protein: Math.round(currentWeight * 2.0),
          carbs: Math.round((cals * 0.45) / 4),
          fats: Math.round((cals * 0.25) / 9),
        });
      }
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 5) {
      setStep(step - 1);
    }
  };

  const toggleTrainingDay = (d: string) => {
    if (trainingDays.includes(d)) {
      if (trainingDays.length > 1) {
        setTrainingDays(trainingDays.filter(day => day !== d));
      }
    } else {
      setTrainingDays([...trainingDays, d]);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Progress Bar Header */}
      <View style={[styles.progressHeader, { paddingTop: topInset + 10 }]}>
        <View style={styles.progressRow}>
          {step > 0 && step < 5 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((step + 1) / TOTAL_STEPS) * 100}%` },
              ]}
            />
          </View>

          <Text style={styles.stepCounterText}>
            {step + 1}/{TOTAL_STEPS}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* STEP 0: Athlete Persona */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.stepIcon}>👋</Text>
            </View>
            <Text style={styles.stepTitle}>Welcome to FitMatrix</Text>
            <Text style={styles.stepSubtitle}>
              Let's build your autonomous metabolic engine. What should your AI companion call you?
            </Text>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>YOUR NAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Athlete Name"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoFocus
              />
            </View>
          </View>
        )}

        {/* STEP 1: Goal & Target Weight */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.stepIcon}>🎯</Text>
            </View>
            <Text style={styles.stepTitle}>What is your goal?</Text>
            <Text style={styles.stepSubtitle}>
              FitMatrix calibrates caloric deficit or surplus and calculates your completion trajectory.
            </Text>

            <View style={styles.goalPillRow}>
              {[
                { key: 'fat_loss', label: '🔥 Fat Loss', desc: 'Preserve muscle in a calibrated deficit' },
                { key: 'maintenance', label: '⚖️ Maintenance', desc: 'Energy balance and body recomposition' },
                { key: 'muscle_gain', label: '⚡ Muscle Gain', desc: 'Hypertrophic surplus with high protein' },
              ].map(opt => {
                const isSelected = goalType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.goalOptionCard, isSelected && styles.goalOptionCardActive]}
                    onPress={() => {
                      setGoalType(opt.key as any);
                      if (opt.key === 'maintenance') {
                        setTargetWeight(currentWeight);
                        setRatePercent(0);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.goalOptionTitle, isSelected && styles.goalOptionTitleActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.goalOptionDesc}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {goalType !== 'maintenance' && (
              <View style={styles.stepperCard}>
                <Text style={styles.stepperLabel}>TARGET WEIGHT</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setTargetWeight(Math.round((targetWeight - 0.5) * 10) / 10)}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>
                    {targetWeight.toFixed(1)} <Text style={styles.unitText}>kg</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setTargetWeight(Math.round((targetWeight + 0.5) * 10) / 10)}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Biometrics */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.stepIcon}>🧬</Text>
            </View>
            <Text style={styles.stepTitle}>Biometric Baseline</Text>
            <Text style={styles.stepSubtitle}>
              Calibrates the Mifflin-St Jeor formula for accurate Basal Metabolic Rate (BMR).
            </Text>

            {/* Sex Toggle */}
            <View style={styles.sexToggleRow}>
              {(['male', 'female'] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sexBtn, sex === s && styles.sexBtnActive]}
                  onPress={() => setSex(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sexBtnText, sex === s && styles.sexBtnTextActive]}>
                    {s === 'male' ? '♂ Biological Male' : '♀ Biological Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Steppers for Age, Height, Weight */}
            <View style={styles.multiStepperRow}>
              <View style={styles.miniStepperBox}>
                <Text style={styles.miniStepperLabel}>AGE</Text>
                <Text style={styles.miniStepperVal}>{age} <Text style={styles.unitText}>yrs</Text></Text>
                <View style={styles.miniControls}>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => setAge(Math.max(16, age - 1))}>
                    <Text style={styles.miniBtnText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => setAge(age + 1)}>
                    <Text style={styles.miniBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.miniStepperBox}>
                <Text style={styles.miniStepperLabel}>HEIGHT</Text>
                <Text style={styles.miniStepperVal}>{heightCm} <Text style={styles.unitText}>cm</Text></Text>
                <View style={styles.miniControls}>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => setHeightCm(heightCm - 1)}>
                    <Text style={styles.miniBtnText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => setHeightCm(heightCm + 1)}>
                    <Text style={styles.miniBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.miniStepperBox}>
                <Text style={styles.miniStepperLabel}>CURRENT WT</Text>
                <Text style={styles.miniStepperVal}>{currentWeight.toFixed(1)} <Text style={styles.unitText}>kg</Text></Text>
                <View style={styles.miniControls}>
                  <TouchableOpacity
                    style={styles.miniBtn}
                    onPress={() => setCurrentWeight(Math.round((currentWeight - 0.5) * 10) / 10)}
                  >
                    <Text style={styles.miniBtnText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniBtn}
                    onPress={() => setCurrentWeight(Math.round((currentWeight + 0.5) * 10) / 10)}
                  >
                    <Text style={styles.miniBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: Activity & Training Schedule */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.stepIcon}>⚡</Text>
            </View>
            <Text style={styles.stepTitle}>Activity & Training</Text>
            <Text style={styles.stepSubtitle}>
              Defines Non-Exercise Activity Thermogenesis (NEAT) and training day cycling.
            </Text>

            <View style={styles.activityList}>
              {[
                { key: 'sedentary', label: 'Desk / Sedentary', desc: 'Mostly sitting throughout the day' },
                { key: 'light', label: 'Lightly Active', desc: '1-3 light sessions or regular walking' },
                { key: 'moderate', label: 'Moderately Active', desc: '3-5 training sessions per week' },
                { key: 'active', label: 'Very Active', desc: 'Heavy training 6-7 days or manual occupation' },
              ].map(act => {
                const isSelected = activityLevel === act.key;
                return (
                  <TouchableOpacity
                    key={act.key}
                    style={[styles.activityCard, isSelected && styles.activityCardActive]}
                    onPress={() => setActivityLevel(act.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.activityLabel, isSelected && styles.activityLabelActive]}>
                      {act.label}
                    </Text>
                    <Text style={styles.activityDesc}>{act.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionHeaderLabel}>TRAINING DAYS (FOR MACRO CYCLING)</Text>
            <View style={styles.daySelectionRow}>
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => {
                const isTrain = trainingDays.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.daySelectBtn, isTrain && styles.daySelectBtnActive]}
                    onPress={() => toggleTrainingDay(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.daySelectText, isTrain && styles.daySelectTextActive]}>
                      {DAY_LABELS[d]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 4: Dietary Blueprint */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.stepIcon}>🥗</Text>
            </View>
            <Text style={styles.stepTitle}>Nutritional Blueprint</Text>
            <Text style={styles.stepSubtitle}>
              Select your macro split preference and protein saturation level.
            </Text>

            <View style={styles.dietPresetGrid}>
              {[
                { key: 'balanced', label: 'Balanced', p: 30, c: 45, f: 25 },
                { key: 'low_carb', label: 'Low-Carb', p: 35, c: 25, f: 40 },
                { key: 'keto', label: 'Ketogenic', p: 25, c: 5, f: 70 },
                { key: 'high_protein', label: 'High Protein', p: 40, c: 40, f: 20 },
              ].map(d => {
                const isSelected = dietStyle === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dietCard, isSelected && styles.dietCardActive]}
                    onPress={() => setDietStyle(d.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dietCardTitle, isSelected && styles.dietCardTitleActive]}>
                      {d.label}
                    </Text>
                    <View style={styles.miniBar}>
                      <View style={{ flex: d.p, backgroundColor: colors.accentOrange, height: 4 }} />
                      <View style={{ flex: d.f, backgroundColor: colors.accentYellow, height: 4 }} />
                      <View style={{ flex: d.c, backgroundColor: colors.accentGreen, height: 4 }} />
                    </View>
                    <Text style={styles.dietRatioText}>
                      {d.p}P / {d.f}F / {d.c}C
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionHeaderLabel}>PROTEIN DENSITY</Text>
            <View style={styles.proteinPillRow}>
              {[
                { key: 'low', label: 'Standard', r: '1.6g/kg' },
                { key: 'moderate', label: 'Optimal', r: '2.0g/kg' },
                { key: 'high', label: 'High', r: '2.4g/kg' },
              ].map(p => {
                const isSelected = proteinPref === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.proteinOption, isSelected && styles.proteinOptionActive]}
                    onPress={() => setProteinPref(p.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.proteinOptionLabel, isSelected && styles.proteinOptionLabelActive]}>
                      {p.label}
                    </Text>
                    <Text style={[styles.proteinOptionRatio, isSelected && styles.proteinOptionRatioActive]}>
                      {p.r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 5: Real-time Metabolic Calibration Reveal Screen */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <View style={styles.revealPulseCircle}>
              <Text style={styles.revealIcon}>✨</Text>
            </View>
            <Text style={styles.stepTitle}>Metabolic Engine Calibrated</Text>
            <Text style={styles.stepSubtitle}>
              Calculated dynamically from your biometric baseline and goal parameters.
            </Text>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.accentGreen} />
                <Text style={styles.loadingText}>Synthesizing 14-day metabolic model...</Text>
              </View>
            ) : calibratedData ? (
              <View style={styles.revealSummaryCard}>
                <View style={styles.revealRow}>
                  <View>
                    <Text style={styles.revealLabel}>BASAL RATE (BMR)</Text>
                    <Text style={styles.revealVal}>{calibratedData.bmr} <Text style={styles.unitText}>kcal</Text></Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.revealLabel}>TRUE EXPENDITURE (TDEE)</Text>
                    <Text style={styles.revealVal}>{calibratedData.tdee} <Text style={styles.unitText}>kcal</Text></Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.targetCalsRow}>
                  <Text style={styles.targetCalsLabel}>DAILY TARGET CALORIES</Text>
                  <Text style={styles.targetCalsVal}>{calibratedData.cals} <Text style={styles.unitText}>kcal/day</Text></Text>
                </View>

                <View style={styles.macroSplitBoxes}>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroPillLabel, { color: colors.accentOrange }]}>PROTEIN</Text>
                    <Text style={styles.macroPillVal}>{calibratedData.protein}g</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroPillLabel, { color: colors.accentGreen }]}>CARBS</Text>
                    <Text style={styles.macroPillVal}>{calibratedData.carbs}g</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroPillLabel, { color: colors.accentYellow }]}>FATS</Text>
                    <Text style={styles.macroPillVal}>{calibratedData.fats}g</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Floating Action CTA Button */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          disabled={loading && step === 5}
          activeOpacity={0.8}
        >
          {loading && step === 5 ? (
            <ActivityIndicator size="small" color={colors.textDark} />
          ) : (
            <Text style={styles.nextBtnText}>
              {step === 4 ? 'Calibrate Metabolic Engine ✨' : step === 5 ? 'Enter FitMatrix Command Center →' : 'Continue →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.appDark,
  },
  progressHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 32,
    height: 32,
  },
  backBtnText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardHeader,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.textPrimary,
    borderRadius: 3,
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  stepContainer: {
    paddingTop: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.cardHeader,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  goalPillRow: {
    gap: 12,
    marginBottom: 20,
  },
  goalOptionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  goalOptionCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.cardHeader,
  },
  goalOptionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  goalOptionTitleActive: {
    color: colors.textPrimary,
  },
  goalOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  stepperCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepperVal: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sexToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  sexBtn: {
    flex: 1,
    backgroundColor: colors.cardBg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sexBtnActive: {
    backgroundColor: colors.textPrimary,
  },
  sexBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sexBtnTextActive: {
    color: colors.textDark,
  },
  multiStepperRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStepperBox: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  miniStepperLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  miniStepperVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  miniControls: {
    flexDirection: 'row',
    gap: 8,
  },
  miniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityList: {
    gap: 10,
    marginBottom: 20,
  },
  activityCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  activityCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.cardHeader,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  activityLabelActive: {
    color: colors.textPrimary,
  },
  activityDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  daySelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  daySelectBtn: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  daySelectBtnActive: {
    backgroundColor: colors.accentGreen + '33',
    borderColor: colors.accentGreen,
  },
  daySelectText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  daySelectTextActive: {
    color: colors.accentGreen,
  },
  dietPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dietCard: {
    width: '48%',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dietCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.cardHeader,
  },
  dietCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dietCardTitleActive: {
    color: colors.textPrimary,
  },
  miniBar: {
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  dietRatioText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  proteinPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  proteinOption: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  proteinOptionActive: {
    backgroundColor: colors.textPrimary,
  },
  proteinOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  proteinOptionLabelActive: {
    color: colors.textDark,
  },
  proteinOptionRatio: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  proteinOptionRatioActive: {
    color: colors.textDark,
  },
  revealPulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.accentGreen,
  },
  revealIcon: {
    fontSize: 28,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  revealSummaryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 14,
  },
  revealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revealLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  revealVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  targetCalsRow: {
    alignItems: 'center',
  },
  targetCalsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  targetCalsVal: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  macroSplitBoxes: {
    flexDirection: 'row',
    gap: 8,
  },
  macroBox: {
    flex: 1,
    backgroundColor: colors.cardHeader,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  macroPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  macroPillVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.appDark + 'ee',
  },
  nextBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
  },
});
