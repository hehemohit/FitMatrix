import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import {
  DISCOMFORT_REGIONS,
  DiscomfortRegion,
  findBiomechanicalSubstitution,
} from '../../utils/biomechanicalSubstitutions';
import { ExerciseRecord } from '../../utils/muscleTargetMapper';

interface DiscomfortSwapModalProps {
  visible: boolean;
  exerciseName: string;
  onClose: () => void;
  onConfirmSwap: (replacement: ExerciseRecord) => void;
}

export const DiscomfortSwapModal: React.FC<DiscomfortSwapModalProps> = ({
  visible,
  exerciseName,
  onClose,
  onConfirmSwap,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<DiscomfortRegion>('lower_back');

  const suggestion = findBiomechanicalSubstitution(exerciseName, selectedRegion);

  const handleApply = () => {
    onConfirmSwap(suggestion.replacement);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.title}>Biomechanical Auto-Regulation</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Experiencing discomfort or joint strain on <Text style={styles.currentExHighlight}>{exerciseName}</Text>? Select the region for an instant axial-safe substitution.
          </Text>

          {/* Discomfort Region Selector */}
          <View style={styles.regionsGrid}>
            {DISCOMFORT_REGIONS.map((r) => {
              const isSelected = r.key === selectedRegion;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.regionCard, isSelected && styles.regionCardActive]}
                  onPress={() => setSelectedRegion(r.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.regionEmoji}>{r.emoji}</Text>
                  <Text style={[styles.regionLabel, isSelected && styles.regionLabelActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Clinical Suggestion Card */}
          <View style={styles.recommendationCard}>
            <View style={styles.recHeaderRow}>
              <Text style={styles.recPill}>⚡ RECOMMENDED SWAP</Text>
              <Text style={styles.recZeroTokenPill}>Zero-Token Local</Text>
            </View>

            <Text style={styles.replacementName}>{suggestion.replacement.name}</Text>
            <Text style={styles.replacementMeta}>
              Target: {suggestion.replacement.target} · Equipment: {suggestion.replacement.equipment}
            </Text>

            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>BIOMECHANICAL RATIONALE</Text>
              <Text style={styles.reasonText}>{suggestion.reason}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Keep Current</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.swapBtn} onPress={handleApply} activeOpacity={0.8}>
              <Text style={styles.swapText}>⚡ Swap for {suggestion.replacement.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#181a20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2e3342',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIcon: {
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '700',
  },
  subtext: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 17,
    marginBottom: 16,
  },
  currentExHighlight: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  regionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  regionCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#121213',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#26262a',
  },
  regionCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1a2234',
  },
  regionEmoji: {
    fontSize: 16,
  },
  regionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  regionLabelActive: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  recommendationCard: {
    backgroundColor: '#13151b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252936',
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 0.5,
  },
  recZeroTokenPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4ade80',
    backgroundColor: '#12261b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  replacementName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  replacementMeta: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    marginBottom: 10,
  },
  reasonBox: {
    backgroundColor: '#1b1d24',
    padding: 10,
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 12,
    color: '#d1d5db',
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#26262a',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  swapBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
});

