import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTrainerStore } from '../../store/useTrainerStore';

interface WeightGoalModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WeightGoalModal: React.FC<WeightGoalModalProps> = ({
  visible,
  onClose,
}) => {
  const { strategyProfile, updateGoal, userProfile } = useTrainerStore();
  const currentGoal = strategyProfile?.target_weight_kg || userProfile?.weight_kg || 75.0;
  const currentUnit = userProfile?.unit || 'kg';

  const [goalStr, setGoalStr] = useState(String(currentGoal));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(goalStr);
    if (isNaN(val) || val <= 20 || val >= 300) {
      Alert.alert('Invalid Goal', 'Please enter a valid target weight between 20 and 300.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateGoal({
        goal_type: strategyProfile?.goal_type || 'fat_loss',
        target_weight_kg: val,
        current_weight_kg: userProfile?.weight_kg,
        weekly_rate_percent: strategyProfile?.weekly_rate_percent || 0.75,
      });
      setIsSubmitting(false);
      onClose();
    } catch {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  const adjustGoal = (delta: number) => {
    const current = parseFloat(goalStr) || 75.0;
    const next = Math.max(20, Math.min(300, current + delta));
    setGoalStr(next.toFixed(1));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Target Weight Goal</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Set your target body weight goal</Text>

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => adjustGoal(-0.5)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepBtnText}>-0.5</Text>
            </TouchableOpacity>

            <View style={styles.valBox}>
              <TextInput
                style={styles.inputVal}
                keyboardType="decimal-pad"
                value={goalStr}
                onChangeText={setGoalStr}
                selectTextOnFocus
              />
              <Text style={styles.unitText}>{currentUnit}</Text>
            </View>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => adjustGoal(0.5)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepBtnText}>+0.5</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {isSubmitting ? 'Updating...' : 'Set Goal'}
            </Text>
          </TouchableOpacity>
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
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#161922',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242838',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1c202d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  stepBtn: {
    backgroundColor: '#242838',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stepBtnText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  valBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: '#0e1017',
    borderRadius: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#242838',
  },
  inputVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 80,
  },
  unitText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
    marginLeft: 6,
  },
  saveBtn: {
    backgroundColor: '#eab308',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
});
