import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { CoachingMode } from '../../types/schema';

interface CoachingModeSelectorProps {
  currentMode: CoachingMode;
  onSelectMode: (mode: CoachingMode) => void;
}

interface ModeDetail {
  key: CoachingMode;
  title: string;
  badge: string;
  badgeColor: string;
  tagline: string;
  features: string[];
}

const MODES: ModeDetail[] = [
  {
    key: 'coached',
    title: 'Coached',
    badge: 'RECOMMENDED',
    badgeColor: colors.accentGreen,
    tagline: 'Full algorithmic guidance. Companion dynamically recalculates TDEE and calibrates weekly targets.',
    features: [
      'Automatic 14-day rolling metabolic expenditure tracking',
      'Adherence-neutral weekly check-in recalibration',
      'Prevents metabolic crashes & preserves lean mass',
    ],
  },
  {
    key: 'collaborative',
    title: 'Collaborative',
    badge: 'FLEXIBLE FLOORS',
    badgeColor: colors.accentBlue,
    tagline: 'Companion establishes energy balance & protein floors; you direct macro allocations.',
    features: [
      'Protected scientific protein & essential fat floors',
      'Unlocked carbs vs fats ratio distribution',
      'Custom training day & rest day energy biases',
    ],
  },
  {
    key: 'manual',
    title: 'Manual',
    badge: 'FIXED TARGETS',
    badgeColor: colors.accentYellow,
    tagline: 'Companion automated recalibration is paused. Fixed static targets maintained by you.',
    features: [
      'Static user-defined calorie & macro goals',
      'No weekly automated expenditure overrides',
      'Full manual control over daily numbers',
    ],
  },
];

export const CoachingModeSelector: React.FC<CoachingModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const activeDetail = MODES.find(m => m.key === currentMode) || MODES[0];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.superTitle}>COACHING INTELLIGENCE</Text>
          <Text style={styles.title}>Program Mode</Text>
        </View>
        <View style={[styles.activeBadge, { backgroundColor: activeDetail.badgeColor + '22' }]}>
          <Text style={[styles.activeBadgeText, { color: activeDetail.badgeColor }]}>
            {activeDetail.badge}
          </Text>
        </View>
      </View>

      {/* 3-Mode Segmented Selector */}
      <View style={styles.segmentContainer}>
        {MODES.map(mode => {
          const isSelected = mode.key === currentMode;
          return (
            <TouchableOpacity
              key={mode.key}
              style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
              onPress={() => onSelectMode(mode.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextActive,
                ]}
              >
                {mode.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Mode Operational Details */}
      <View style={styles.detailBox}>
        <Text style={styles.detailTagline}>{activeDetail.tagline}</Text>

        <View style={styles.featuresList}>
          {activeDetail.features.map((feat, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.textPrimary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textDark,
  },
  detailBox: {
    backgroundColor: colors.cardHeader + '55',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle + '44',
  },
  detailTagline: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletCheck: {
    fontSize: 12,
    color: colors.accentGreen,
    fontWeight: '800',
    marginTop: 1,
  },
  featureText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});
