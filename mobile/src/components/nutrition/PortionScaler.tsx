import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface PortionScalerProps {
  multiplier: number;
  baseGrams?: number;
  currentGrams?: number;
  onSelectMultiplier: (m: number) => void;
  onAdjustGrams?: (delta: number) => void;
}

const PRESET_MULTIPLIERS = [0.5, 1.0, 1.5, 2.0];

export const PortionScaler: React.FC<PortionScalerProps> = ({
  multiplier,
  baseGrams = 100,
  currentGrams,
  onSelectMultiplier,
  onAdjustGrams,
}) => {
  const displayGrams = currentGrams !== undefined ? currentGrams : Math.round(baseGrams * multiplier);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>PORTION SCALER</Text>
        <Text style={styles.gramsText}>{displayGrams}g total</Text>
      </View>

      {/* Multiplier Presets */}
      <View style={styles.presetsRow}>
        {PRESET_MULTIPLIERS.map(m => {
          const isSelected = Math.abs(multiplier - m) < 0.05;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
              onPress={() => onSelectMultiplier(m)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                {m}x
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Stepper Buttons for Fine Gram Adjustment */}
        {onAdjustGrams && (
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onAdjustGrams(-25)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepBtnText}>-25g</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onAdjustGrams(25)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepBtnText}>+25g</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardHeader + '55',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle + '44',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  gramsText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentBlue,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: colors.cardHeader,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  presetBtnActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  presetBtnTextActive: {
    color: colors.textDark,
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBtn: {
    backgroundColor: colors.cardHeader,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentYellow,
  },
});
