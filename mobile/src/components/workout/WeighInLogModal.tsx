import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useTrainerStore } from '../../store/useTrainerStore';

interface WeighInLogModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WeighInLogModal: React.FC<WeighInLogModalProps> = ({
  visible,
  onClose,
}) => {
  const topInset = useSafeTopInset(12);
  const { weighIn, userProfile } = useTrainerStore();
  const currentUnit = userProfile?.unit || 'kg';

  const defaultWeight = userProfile?.weight_kg ? String(userProfile.weight_kg) : '75.0';
  const [weightStr, setWeightStr] = useState(defaultWeight);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(weightStr);
    if (isNaN(val) || val <= 20 || val >= 300) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight between 20 and 300.');
      return;
    }

    try {
      setIsSubmitting(true);
      await weighIn(val);
      setIsSubmitting(false);
      onClose();
    } catch {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to save weigh-in. Please try again.');
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weightStr) || 75.0;
    const next = Math.max(20, Math.min(300, current + delta));
    setWeightStr(next.toFixed(1));
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
            <Text style={styles.title}>Log Weigh-in</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Enter your morning weigh-in for today</Text>

          {/* Stepper + Input */}
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => adjustWeight(-0.2)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepBtnText}>-0.2</Text>
            </TouchableOpacity>

            <View style={styles.valBox}>
              <TextInput
                style={styles.inputVal}
                keyboardType="decimal-pad"
                value={weightStr}
                onChangeText={setWeightStr}
                selectTextOnFocus
              />
              <Text style={styles.unitText}>{currentUnit}</Text>
            </View>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => adjustWeight(0.2)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepBtnText}>+0.2</Text>
            </TouchableOpacity>
          </View>

          {/* Quick presets */}
          <View style={styles.presetsRow}>
            {[-1.0, -0.5, 0.5, 1.0].map(amt => (
              <TouchableOpacity
                key={amt}
                style={styles.presetPill}
                onPress={() => adjustWeight(amt)}
              >
                <Text style={styles.presetText}>
                  {amt > 0 ? `+${amt}` : amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {isSubmitting ? 'Saving...' : 'Save Weigh-in'}
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
    marginBottom: 16,
  },
  stepBtn: {
    backgroundColor: '#242838',
    paddingHorizontal: 12,
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
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  presetPill: {
    backgroundColor: '#1c202d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a3044',
  },
  presetText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#22c55e',
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
