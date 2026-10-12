import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { DietStyle, ProteinPreference } from '../../types/schema';

interface MacroPresetSelectorProps {
  currentDietStyle: DietStyle;
  currentProteinPref: ProteinPreference;
  onSelectDietStyle: (style: DietStyle) => void;
  onSelectProteinPref: (pref: ProteinPreference) => void;
}

interface DietPreset {
  key: DietStyle;
  name: string;
  desc: string;
  proteinPct: number;
  carbsPct: number;
  fatsPct: number;
}

const PRESETS: DietPreset[] = [
  {
    key: 'balanced',
    name: 'Balanced',
    desc: 'Versatile performance split for mixed training and everyday flexibility.',
    proteinPct: 30,
    carbsPct: 45,
    fatsPct: 25,
  },
  {
    key: 'low_carb',
    name: 'Low-Carb',
    desc: 'Moderate carbohydrates with higher healthy fat allocation.',
    proteinPct: 35,
    carbsPct: 25,
    fatsPct: 40,
  },
  {
    key: 'keto',
    name: 'Ketogenic',
    desc: 'Extremely restricted carbs (<35g) to trigger nutritional ketosis.',
    proteinPct: 25,
    carbsPct: 5,
    fatsPct: 70,
  },
  {
    key: 'high_protein',
    name: 'High Protein',
    desc: 'Maximum muscle-sparing saturation for bodybuilding and aggressive cuts.',
    proteinPct: 40,
    carbsPct: 40,
    fatsPct: 20,
  },
];

const PROTEIN_PREFS: Array<{ key: ProteinPreference; label: string; ratio: string }> = [
  { key: 'low', label: 'Low', ratio: '1.6 g/kg' },
  { key: 'moderate', label: 'Moderate', ratio: '2.0 g/kg' },
  { key: 'high', label: 'High', ratio: '2.4 g/kg' },
];

export const MacroPresetSelector: React.FC<MacroPresetSelectorProps> = ({
  currentDietStyle,
  currentProteinPref,
  onSelectDietStyle,
  onSelectProteinPref,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.superTitle}>MACRO ARCHITECTURE</Text>
          <Text style={styles.title}>Diet Style & Macros</Text>
        </View>
      </View>

      {/* 2x2 Grid of Diet Style Presets */}
      <View style={styles.presetGrid}>
        {PRESETS.map(preset => {
          const isSelected = currentDietStyle === preset.key;
          return (
            <TouchableOpacity
              key={preset.key}
              style={[
                styles.presetCard,
                isSelected && styles.presetCardActive,
              ]}
              onPress={() => onSelectDietStyle(preset.key)}
              activeOpacity={0.8}
            >
              <View style={styles.presetTop}>
                <Text
                  style={[
                    styles.presetName,
                    isSelected && styles.presetNameActive,
                  ]}
                >
                  {preset.name}
                </Text>
                {isSelected && <Text style={styles.checkIcon}>●</Text>}
              </View>

              {/* Tri-color Macro Split Bar */}
              <View style={styles.macroBarContainer}>
                <View
                  style={[
                    styles.macroBarSegment,
                    { flex: preset.proteinPct, backgroundColor: colors.accentOrange },
                  ]}
                />
                <View
                  style={[
                    styles.macroBarSegment,
                    { flex: preset.fatsPct, backgroundColor: colors.accentYellow },
                  ]}
                />
                <View
                  style={[
                    styles.macroBarSegment,
                    { flex: preset.carbsPct, backgroundColor: colors.accentGreen },
                  ]}
                />
              </View>

              {/* Percentage breakdown */}
              <View style={styles.ratioRow}>
                <Text style={[styles.ratioText, { color: colors.accentOrange }]}>
                  {preset.proteinPct}% P
                </Text>
                <Text style={[styles.ratioText, { color: colors.accentYellow }]}>
                  {preset.fatsPct}% F
                </Text>
                <Text style={[styles.ratioText, { color: colors.accentGreen }]}>
                  {preset.carbsPct}% C
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Protein Intake Density Preference */}
      <View style={styles.proteinSection}>
        <View style={styles.proteinHeaderRow}>
          <Text style={styles.proteinSectionTitle}>PROTEIN TARGET DENSITY</Text>
          <Text style={styles.proteinSectionSub}>Lean Mass Preservation</Text>
        </View>

        <View style={styles.proteinPillRow}>
          {PROTEIN_PREFS.map(pref => {
            const isSelected = currentProteinPref === pref.key;
            return (
              <TouchableOpacity
                key={pref.key}
                style={[
                  styles.proteinPill,
                  isSelected && styles.proteinPillActive,
                ]}
                onPress={() => onSelectProteinPref(pref.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.proteinPillLabel,
                    isSelected && styles.proteinPillLabelActive,
                  ]}
                >
                  {pref.label}
                </Text>
                <Text
                  style={[
                    styles.proteinPillRatio,
                    isSelected && styles.proteinPillRatioActive,
                  ]}
                >
                  {pref.ratio}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerRow: {
    marginBottom: 14,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.0,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  presetCard: {
    width: '48%',
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.cardHeader,
  },
  presetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  presetNameActive: {
    color: colors.textPrimary,
  },
  checkIcon: {
    fontSize: 8,
    color: colors.accentGreen,
  },
  macroBarContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
    gap: 2,
  },
  macroBarSegment: {
    height: '100%',
    borderRadius: 1,
  },
  ratioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratioText: {
    fontSize: 10,
    fontWeight: '700',
  },
  proteinSection: {
    backgroundColor: colors.cardHeader + '55',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle + '44',
  },
  proteinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  proteinSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  proteinSectionSub: {
    fontSize: 10,
    color: colors.accentOrange,
    fontWeight: '600',
  },
  proteinPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  proteinPill: {
    flex: 1,
    backgroundColor: colors.cardHeader,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  proteinPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  proteinPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  proteinPillLabelActive: {
    color: colors.textDark,
  },
  proteinPillRatio: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  proteinPillRatioActive: {
    color: colors.textDark,
    fontWeight: '700',
  },
});
