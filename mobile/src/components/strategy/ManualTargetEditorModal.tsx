import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { colors } from '../../theme/colors';

interface ManualTargetEditorModalProps {
  visible: boolean;
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFats: number;
  onClose: () => void;
  onSave: (targets: {
    target_calories: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fats_g: number;
  }) => void;
}

export const ManualTargetEditorModal: React.FC<ManualTargetEditorModalProps> = ({
  visible,
  currentCalories,
  currentProtein,
  currentCarbs,
  currentFats,
  onClose,
  onSave,
}) => {
  const [calories, setCalories] = useState(String(currentCalories));
  const [protein, setProtein] = useState(String(currentProtein));
  const [carbs, setCarbs] = useState(String(currentCarbs));
  const [fats, setFats] = useState(String(currentFats));

  useEffect(() => {
    if (visible) {
      setCalories(String(currentCalories));
      setProtein(String(currentProtein));
      setCarbs(String(currentCarbs));
      setFats(String(currentFats));
    }
  }, [visible, currentCalories, currentProtein, currentCarbs, currentFats]);

  const pNum = parseFloat(protein) || 0;
  const cNum = parseFloat(carbs) || 0;
  const fNum = parseFloat(fats) || 0;
  const calculatedCals = Math.round(pNum * 4 + cNum * 4 + fNum * 9);
  const targetCalNum = parseFloat(calories) || 0;
  const calDiff = calculatedCals - targetCalNum;

  const handleAutoBalanceCalories = () => {
    setCalories(String(calculatedCals));
  };

  const handleSave = () => {
    const finalCals = targetCalNum > 500 ? targetCalNum : calculatedCals;
    onSave({
      target_calories: finalCals,
      target_protein_g: Math.round(pNum),
      target_carbs_g: Math.round(cNum),
      target_fats_g: Math.round(fNum),
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.superTitle}>MANUAL PROGRAM MODE</Text>
                  <Text style={styles.title}>Custom Daily Targets</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.description}>
                Set your exact energy budget and macronutrient split. FitMatrix automated recalibration is paused while in Manual Mode.
              </Text>

              {/* Calorie Budget Input */}
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>DAILY CALORIES (KCAL)</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.largeInput}
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="number-pad"
                    placeholder="2200"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={5}
                  />
                  <Text style={styles.inputUnit}>kcal</Text>
                </View>
              </View>

              {/* Macro Inputs Grid */}
              <View style={styles.macroGrid}>
                {/* Protein */}
                <View style={styles.macroBox}>
                  <View style={styles.macroHeader}>
                    <View style={[styles.macroDot, { backgroundColor: colors.accentOrange }]} />
                    <Text style={styles.macroName}>Protein</Text>
                  </View>
                  <View style={styles.macroInputRow}>
                    <TextInput
                      style={styles.macroInput}
                      value={protein}
                      onChangeText={setProtein}
                      keyboardType="number-pad"
                      placeholder="160"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={4}
                    />
                    <Text style={styles.macroUnit}>g</Text>
                  </View>
                  <Text style={styles.macroCals}>{Math.round(pNum * 4)} kcal</Text>
                </View>

                {/* Carbs */}
                <View style={styles.macroBox}>
                  <View style={styles.macroHeader}>
                    <View style={[styles.macroDot, { backgroundColor: colors.accentGreen }]} />
                    <Text style={styles.macroName}>Carbs</Text>
                  </View>
                  <View style={styles.macroInputRow}>
                    <TextInput
                      style={styles.macroInput}
                      value={carbs}
                      onChangeText={setCarbs}
                      keyboardType="number-pad"
                      placeholder="220"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={4}
                    />
                    <Text style={styles.macroUnit}>g</Text>
                  </View>
                  <Text style={styles.macroCals}>{Math.round(cNum * 4)} kcal</Text>
                </View>

                {/* Fats */}
                <View style={styles.macroBox}>
                  <View style={styles.macroHeader}>
                    <View style={[styles.macroDot, { backgroundColor: colors.accentYellow }]} />
                    <Text style={styles.macroName}>Fats</Text>
                  </View>
                  <View style={styles.macroInputRow}>
                    <TextInput
                      style={styles.macroInput}
                      value={fats}
                      onChangeText={setFats}
                      keyboardType="number-pad"
                      placeholder="65"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={4}
                    />
                    <Text style={styles.macroUnit}>g</Text>
                  </View>
                  <Text style={styles.macroCals}>{Math.round(fNum * 9)} kcal</Text>
                </View>
              </View>

              {/* Energy Balance Bar */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Macro Sum vs Target</Text>
                  <Text style={styles.balanceValues}>
                    {calculatedCals} / {targetCalNum} kcal
                  </Text>
                </View>

                {Math.abs(calDiff) > 15 ? (
                  <View style={styles.diffAlertRow}>
                    <Text style={styles.diffAlertText}>
                      {calDiff > 0
                        ? `Macros exceed target by +${calDiff} kcal`
                        : `Macros are ${Math.abs(calDiff)} kcal below target`}
                    </Text>
                    <TouchableOpacity
                      style={styles.autoBalanceBtn}
                      onPress={handleAutoBalanceCalories}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.autoBalanceText}>Sync Target to Macros</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.balanceSuccessText}>✓ Macros match calorie target</Text>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>Apply Manual Targets</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.accentYellow,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 16,
  },
  fieldBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  largeInput: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    padding: 0,
    flex: 1,
  },
  inputUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  macroBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 10,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroInput: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    padding: 0,
    flex: 1,
  },
  macroUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 3,
  },
  macroCals: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    marginBottom: 18,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  balanceValues: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  diffAlertRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  diffAlertText: {
    fontSize: 11,
    color: colors.accentYellow,
    fontWeight: '600',
    flex: 1,
  },
  autoBalanceBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoBalanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentYellow,
  },
  balanceSuccessText: {
    fontSize: 11,
    color: colors.accentGreen,
    fontWeight: '600',
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.accentBlue,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
  },
});
