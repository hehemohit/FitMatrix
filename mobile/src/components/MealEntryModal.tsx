/**
 * MealEntryModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A bottom-sheet modal for logging individual meals.
 *
 * Features:
 *  • Free-text AI macro estimation (Gemini/Groq estimates calories + macros from description)
 *  • Manual override of any field
 *  • Category selector (Breakfast / Lunch / Dinner / Snack / Pre-Workout / Post-Workout)
 *  • Optimistic UI — MacroCard updates instantly before server confirms
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { estimateMealMacros } from '../api/coachApi';
import type { MealItem } from '../api/coachApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

const CATEGORY_ICONS: Record<string, string> = {
  Breakfast: '🌅',
  Lunch: '☀️',
  Dinner: '🌙',
  Snack: '🍎',
  'Pre-Workout': '⚡',
  'Post-Workout': '💪',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MealEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onLog: (meal: MealItem) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MealEntryModal: React.FC<MealEntryModalProps> = ({
  visible,
  onClose,
  onLog,
}) => {
  // ── Form state ───────────────────────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [logging, setLogging] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  const [step, setStep] = useState<'describe' | 'confirm'>('describe');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setDescription('');
    setName('');
    setCategory('Lunch');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setEstimating(false);
    setLogging(false);
    setEstimateError('');
    setStep('describe');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── AI Macro Estimation ───────────────────────────────────────────────────────
  const handleEstimate = useCallback(async () => {
    if (!description.trim()) {
      shake();
      setEstimateError('Describe the meal first — be specific for accurate estimates.');
      return;
    }
    Keyboard.dismiss();
    setEstimating(true);
    setEstimateError('');
    try {
      const est = await estimateMealMacros(description.trim());
      setName(est.name ?? description.trim());
      setCalories(String(est.calories ?? 0));
      setProtein(String(est.protein_g ?? 0));
      setCarbs(String(est.carbs_g ?? 0));
      setFats(String(est.fats_g ?? 0));
      setStep('confirm');
    } catch {
      setEstimateError('Could not estimate — check connection or enter manually.');
    } finally {
      setEstimating(false);
    }
  }, [description, shake]);

  // ── Log Meal ──────────────────────────────────────────────────────────────────
  const handleLog = useCallback(async () => {
    const cal = parseInt(calories, 10);
    const pro = parseInt(protein, 10);
    if (!name.trim() || isNaN(cal) || isNaN(pro)) {
      shake();
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const meal: MealItem = {
      name: name.trim(),
      category,
      time: timeStr,
      calories: cal,
      protein_g: pro,
      carbs_g: parseInt(carbs, 10) || 0,
      fats_g: parseInt(fats, 10) || 0,
    };

    setLogging(true);
    try {
      await onLog(meal);
      handleClose();
    } finally {
      setLogging(false);
    }
  }, [name, category, calories, protein, carbs, fats, onLog, handleClose, shake]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const renderDescribeStep = () => (
    <>
      <Text style={styles.stepLabel}>Step 1 — What did you eat?</Text>
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TextInput
          style={[styles.input, styles.multiLine]}
          placeholder="e.g. 2 boiled eggs, 1 brown bread with peanut butter and a banana"
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={text => { setDescription(text); setEstimateError(''); }}
          multiline
          numberOfLines={3}
          returnKeyType="done"
          blurOnSubmit
          testID="meal-description-input"
        />
      </Animated.View>

      {estimateError ? (
        <Text style={styles.errorText}>{estimateError}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary, estimating && styles.btnDisabled]}
        onPress={handleEstimate}
        disabled={estimating}
        testID="estimate-btn"
      >
        {estimating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnPrimaryText}>✨ Estimate with AI</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => setStep('confirm')}
        testID="manual-entry-btn"
      >
        <Text style={styles.btnSecondaryText}>Enter manually</Text>
      </TouchableOpacity>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <Text style={styles.stepLabel}>Step 2 — Confirm & log</Text>

      {/* Meal name */}
      <TextInput
        style={styles.input}
        placeholder="Meal name"
        placeholderTextColor="#aaa"
        value={name}
        onChangeText={setName}
        testID="meal-name-input"
      />

      {/* Category selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
            onPress={() => setCategory(cat)}
            testID={`category-${cat}`}
          >
            <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
              {CATEGORY_ICONS[cat]} {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Macro grid */}
      <View style={styles.macroGrid}>
        <MacroInput label="Calories" unit="kcal" value={calories} onChange={setCalories} highlight testID="cal-input" />
        <MacroInput label="Protein" unit="g" value={protein} onChange={setProtein} highlight testID="protein-input" />
        <MacroInput label="Carbs" unit="g" value={carbs} onChange={setCarbs} testID="carbs-input" />
        <MacroInput label="Fats" unit="g" value={fats} onChange={setFats} testID="fats-input" />
      </View>

      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary, logging && styles.btnDisabled]}
        onPress={handleLog}
        disabled={logging}
        testID="log-meal-btn"
      >
        {logging ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnPrimaryText}>+ Log Meal</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnGhost]}
        onPress={() => setStep('describe')}
        testID="back-btn"
      >
        <Text style={styles.btnGhostText}>← Back</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Log Meal</Text>
          <TouchableOpacity onPress={handleClose} testID="close-btn">
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 'describe' ? renderDescribeStep() : renderConfirmStep()}
          {/* Bottom padding for home indicator */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── MacroInput sub-component ─────────────────────────────────────────────────

interface MacroInputProps {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  highlight?: boolean;
  testID?: string;
}

const MacroInput: React.FC<MacroInputProps> = ({ label, unit, value, onChange, highlight, testID }) => (
  <View style={styles.macroInputContainer}>
    <Text style={[styles.macroInputLabel, highlight && styles.macroInputLabelHighlight]}>{label}</Text>
    <View style={[styles.macroInputRow, highlight && styles.macroInputRowHighlight]}>
      <TextInput
        style={[styles.macroInputField, highlight && styles.macroInputFieldHighlight]}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor="#ccc"
        testID={testID}
      />
      <Text style={styles.macroUnit}>{unit}</Text>
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const ACCENT = '#4b88eb';
const SURFACE = '#1c1c1e';
const CARD = '#242426';
const TEXT = '#ffffff';
const MUTED = '#808288';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: '#44416A',
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.3,
  },
  closeBtn: {
    fontSize: 18,
    color: MUTED,
    padding: 4,
  },
  stepLabel: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3758',
  },
  multiLine: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 10,
    marginTop: -4,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimary: {
    backgroundColor: ACCENT,
  },
  btnSecondary: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  btnSecondaryText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  btnGhostText: {
    color: MUTED,
    fontWeight: '500',
    fontSize: 14,
  },
  categoryScroll: {
    marginBottom: 14,
  },
  categoryChip: {
    backgroundColor: CARD,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3A3758',
  },
  categoryChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  categoryText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  macroInputContainer: {
    width: '46%',
  },
  macroInputLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  macroInputLabelHighlight: {
    color: ACCENT,
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3758',
    paddingHorizontal: 10,
  },
  macroInputRowHighlight: {
    borderColor: ACCENT,
  },
  macroInputField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
  },
  macroInputFieldHighlight: {
    color: ACCENT,
  },
  macroUnit: {
    fontSize: 12,
    color: MUTED,
    marginLeft: 4,
  },
});
