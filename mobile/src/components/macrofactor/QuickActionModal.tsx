import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../theme/colors';

interface QuickActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: 'meal' | 'weight' | 'workout') => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  visible,
  onClose,
  onSelectAction,
}) => {
  const handleAction = (action: 'meal' | 'weight' | 'workout') => {
    onClose();
    setTimeout(() => {
      onSelectAction(action);
    }, 150);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.dragHandle} />
              <Text style={styles.sheetTitle}>Quick Entry</Text>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleAction('meal')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#4b88eb22' }]}>
                  <Text style={styles.actionEmoji}>🍎</Text>
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionLabel}>Log Food</Text>
                  <Text style={styles.actionDesc}>AI estimate or quick macro entry</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleAction('weight')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#3eb47422' }]}>
                  <Text style={styles.actionEmoji}>⚖️</Text>
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionLabel}>Weigh-In</Text>
                  <Text style={styles.actionDesc}>Record morning scale weight</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleAction('workout')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#de723722' }]}>
                  <Text style={styles.actionEmoji}>🏋️</Text>
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionLabel}>Log Workout</Text>
                  <Text style={styles.actionDesc}>Check-in training volume & RPE</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBg, // #1c1c1e
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardHeader,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionTextCol: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
