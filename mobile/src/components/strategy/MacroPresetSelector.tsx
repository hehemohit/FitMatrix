import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { CoachingMode, DietStyle, ProteinPreference } from '../../types/schema';
import { AnimatedSegmentedControl, SegmentOption } from './AnimatedSegmentedControl';

interface MacroPresetSelectorProps {
  currentDietStyle: DietStyle;
  currentProteinPref: ProteinPreference;
  coachingMode?: CoachingMode;
  onSelectDietStyle: (style: DietStyle) => void;
  onSelectProteinPref: (pref: ProteinPreference) => void;
  onOpenManualEditor?: () => void;
  loading?: boolean;
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

const PROTEIN_SEGMENTS: SegmentOption<ProteinPreference>[] = [
  { key: 'low', label: 'Low', subLabel: '1.6 g/kg' },
  { key: 'moderate', label: 'Moderate', subLabel: '2.0 g/kg' },
  { key: 'high', label: 'High', subLabel: '2.4 g/kg' },
];

interface PresetCardProps {
  preset: DietPreset;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  isSelected,
  disabled,
  onSelect,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkScaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkScaleAnim, {
      toValue: isSelected ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isSelected, checkScaleAnim]);

  const handlePress = () => {
    if (disabled || isSelected) return;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
    ]).start();

    onSelect();
  };

  return (
    <Animated.View style={[styles.presetCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.presetCard,
          isSelected && styles.presetCardActive,
          disabled && styles.presetCardDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled || isSelected}
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
          <Animated.View style={{ transform: [{ scale: checkScaleAnim }] }}>
            <View style={styles.checkBadge}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          </Animated.View>
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
    </Animated.View>
  );
};

export const MacroPresetSelector: React.FC<MacroPresetSelectorProps> = ({
  currentDietStyle,
  currentProteinPref,
  coachingMode = 'coached',
  onSelectDietStyle,
  onSelectProteinPref,
  onOpenManualEditor,
  loading = false,
}) => {
  const [isDietTransitioning, setIsDietTransitioning] = useState(false);
  const [isProteinTransitioning, setIsProteinTransitioning] = useState(false);

  // Synchronize loading status when async request concludes
  useEffect(() => {
    if (!loading) {
      setIsDietTransitioning(false);
      setIsProteinTransitioning(false);
    }
  }, [loading]);

  const isDietBusy = loading || isDietTransitioning;
  const isProteinBusy = loading || isProteinTransitioning;

  const handleSelectDietStyle = (style: DietStyle) => {
    if (style === currentDietStyle || isDietBusy) return;
    setIsDietTransitioning(true);
    onSelectDietStyle(style);
  };

  const handleSelectProteinPref = (pref: ProteinPreference) => {
    if (pref === currentProteinPref || isProteinBusy) return;
    setIsProteinTransitioning(true);
    onSelectProteinPref(pref);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.superTitle}>MACRO ARCHITECTURE</Text>
            <Text style={styles.title}>Diet Style & Macros</Text>
          </View>
          {coachingMode === 'manual' && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>MANUAL MODE</Text>
            </View>
          )}
        </View>

        {coachingMode === 'manual' && onOpenManualEditor && (
          <TouchableOpacity
            style={styles.manualNoticeBox}
            onPress={onOpenManualEditor}
            activeOpacity={0.8}
          >
            <Text style={styles.manualNoticeText}>
              ✏️ Manual Mode is active. Select any preset below as a template, or{' '}
              <Text style={styles.manualNoticeLink}>tap here to edit exact gram targets</Text>.
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2x2 Grid of Animated Diet Style Presets */}
      <View
        style={styles.presetGrid}
        pointerEvents={isDietBusy ? 'none' : 'auto'}
      >
        {PRESETS.map(preset => (
          <PresetCard
            key={preset.key}
            preset={preset}
            isSelected={currentDietStyle === preset.key}
            disabled={isDietBusy}
            onSelect={() => handleSelectDietStyle(preset.key)}
          />
        ))}
      </View>

      {/* Protein Intake Density Preference with Animated Sliding Pill */}
      <View style={styles.proteinSection}>
        <View style={styles.proteinHeaderRow}>
          <Text style={styles.proteinSectionTitle}>PROTEIN TARGET DENSITY</Text>
          <Text style={styles.proteinSectionSub}>Lean Mass Preservation</Text>
        </View>

        <AnimatedSegmentedControl
          options={PROTEIN_SEGMENTS}
          selectedKey={currentProteinPref}
          onSelect={handleSelectProteinPref}
          disabled={isProteinBusy}
          style={{ marginBottom: 0 }}
        />
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manualBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  manualBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accentYellow,
    letterSpacing: 0.6,
  },
  manualNoticeBox: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    padding: 10,
  },
  manualNoticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  manualNoticeLink: {
    color: colors.accentYellow,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  presetCardWrapper: {
    width: '48%',
  },
  presetCard: {
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.cardHeader + 'ee',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  presetCardDisabled: {
    opacity: 0.7,
  },
  presetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 20,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  presetNameActive: {
    color: colors.textPrimary,
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textDark,
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
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle + '44',
  },
  proteinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
});
