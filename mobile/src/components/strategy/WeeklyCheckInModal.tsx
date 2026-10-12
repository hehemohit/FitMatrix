import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { CheckInResult } from '../../types/schema';

interface WeeklyCheckInModalProps {
  visible: boolean;
  result: CheckInResult | null;
  onClose: () => void;
  onAccept: () => void;
}

export const WeeklyCheckInModal: React.FC<WeeklyCheckInModalProps> = ({
  visible,
  result,
  onClose,
  onAccept,
}) => {
  if (!result) return null;

  const {
    narrative_coaching,
    old_expenditure,
    new_expenditure,
    old_targets,
    new_targets,
    deltas,
  } = result;

  const expDelta = new_expenditure - old_expenditure;

  const renderDiffRow = (
    label: string,
    dotColor: string,
    oldVal: number,
    newVal: number,
    delta: number,
    unit: string
  ) => {
    const isPositive = delta > 0;
    const isZero = delta === 0;
    const deltaColor = isZero ? colors.textSecondary : isPositive ? colors.accentGreen : colors.accentOrange;
    const sign = isPositive ? '+' : '';

    return (
      <View style={styles.diffRow}>
        <View style={styles.macroTagRow}>
          <View style={[styles.macroDot, { backgroundColor: dotColor }]} />
          <Text style={styles.diffLabel}>{label}</Text>
        </View>

        <View style={styles.diffValuesRow}>
          <Text style={styles.oldValText}>{oldVal}{unit}</Text>
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.newValText}>{newVal}{unit}</Text>
          <View style={[styles.deltaPill, { backgroundColor: deltaColor + '22' }]}>
            <Text style={[styles.deltaText, { color: deltaColor }]}>
              {sign}{delta}{unit}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.sparkleBadge}>
              <Text style={styles.sparkleEmoji}>✨</Text>
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.modalSuperTitle}>ADHERENCE NEUTRALITY</Text>
              <Text style={styles.modalTitle}>Weekly Companion Review</Text>
            </View>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Philosophical Note */}
            <View style={styles.philosophyBox}>
              <Text style={styles.philosophyText}>
                MacroFactor operates on adherence neutrality: your intake and weigh-in records are purely objective metabolic data. Targets adapt seamlessly to keep you on trajectory without compensatory restriction.
              </Text>
            </View>

            {/* Expenditure Adaptation Card */}
            <View style={styles.expBox}>
              <Text style={styles.expTitle}>METABOLIC EXPENDITURE</Text>
              <View style={styles.expRow}>
                <View>
                  <Text style={styles.expVal}>
                    {new_expenditure.toLocaleString()} <Text style={styles.expUnit}>kcal/day</Text>
                  </Text>
                  <Text style={styles.expPrev}>Prior: {old_expenditure.toLocaleString()} kcal/day</Text>
                </View>
                <View style={[styles.expDeltaBadge, { backgroundColor: colors.accentGreen + '22' }]}>
                  <Text style={styles.expDeltaText}>
                    {expDelta >= 0 ? `+${expDelta}` : expDelta} kcal
                  </Text>
                </View>
              </View>
            </View>

            {/* AI Narrative Coaching Note */}
            <View style={styles.narrativeBox}>
              <Text style={styles.narrativeTitle}>COMPANION ASSESSMENT</Text>
              <Text style={styles.narrativeBody}>{narrative_coaching}</Text>
            </View>

            {/* Target Changes Comparison Table */}
            <View style={styles.diffTable}>
              <Text style={styles.diffTableTitle}>UPDATED TARGET COMPARISON</Text>

              {renderDiffRow(
                'Calories',
                colors.accentBlue,
                old_targets.calories,
                new_targets.calories,
                deltas.calories,
                ' kcal'
              )}
              {renderDiffRow(
                'Protein',
                colors.accentOrange,
                old_targets.protein_g,
                new_targets.protein_g,
                deltas.protein_g,
                'g'
              )}
              {renderDiffRow(
                'Carbohydrates',
                colors.accentGreen,
                old_targets.carbs_g,
                new_targets.carbs_g,
                deltas.carbs_g,
                'g'
              )}
              {renderDiffRow(
                'Fats',
                colors.accentYellow,
                old_targets.fats_g,
                new_targets.fats_g,
                deltas.fats_g,
                'g'
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptBtnText}>✓ Apply Targets</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sparkleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sparkleEmoji: {
    fontSize: 20,
  },
  headerTextCol: {
    flex: 1,
  },
  modalSuperTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  modalScroll: {
    marginBottom: 16,
  },
  philosophyBox: {
    backgroundColor: colors.cardHeader + '66',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentBlue,
  },
  philosophyText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  expBox: {
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  expTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expVal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  expUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  expPrev: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expDeltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  expDeltaText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentGreen,
  },
  narrativeBox: {
    backgroundColor: colors.cardHeader + '55',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle + '44',
  },
  narrativeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentGreen,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  narrativeBody: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  diffTable: {
    backgroundColor: colors.cardHeader + '44',
    borderRadius: 14,
    padding: 14,
  },
  diffTableTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle + '44',
  },
  macroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  diffLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  diffValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  oldValText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  arrowText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  newValText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deltaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
});
