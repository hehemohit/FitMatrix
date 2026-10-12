import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';

interface WeighInModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (weightKg: number) => Promise<void>;
  initialWeight?: number;
}

export const WeighInModal: React.FC<WeighInModalProps> = ({
  visible,
  onClose,
  onSave,
  initialWeight = 75.0,
}) => {
  const [weight, setWeight] = useState(initialWeight ? String(initialWeight) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 30 || val >= 300) return;

    setSaving(true);
    try {
      await onSave(val);
      onClose();
    } catch (e) {
      console.warn('Error saving weight:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Daily Weigh-In</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Log your morning scale weight for dynamic metabolic expenditure tracking.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="75.0"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <Text style={styles.unitText}>kg</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.disabledBtn]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.textDark} size="small" />
              ) : (
                <Text style={styles.saveText}>Save Weight</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.cardBg, // #1c1c1e
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.appDark,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unitText: {
    fontSize: 18,
    color: colors.accentGreen,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.cardHeader,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.textDark,
    fontWeight: '700',
    fontSize: 14,
  },
});
