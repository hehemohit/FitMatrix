import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';

interface WorkoutOptionMenuModalProps {
  visible: boolean;
  onClose: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onMinimize: () => void;
  onComplete: () => void;
  onDiscard: () => void;
  onRename?: () => void;
  onMarkAllDone?: () => void;
  onAddExercise?: () => void;
}

export const WorkoutOptionMenuModal: React.FC<WorkoutOptionMenuModalProps> = ({
  visible,
  onClose,
  isPaused,
  onTogglePause,
  onMinimize,
  onComplete,
  onDiscard,
  onRename,
  onMarkAllDone,
  onAddExercise,
}) => {
  const handleConfirmDiscard = () => {
    Alert.alert(
      'Discard Workout?',
      'Are you sure you want to end this workout without saving any progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            onClose();
            onDiscard();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Workout Options</Text>

          {/* Rename Routine */}
          {onRename && (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                onClose();
                onRename();
              }}
            >
              <Text style={styles.menuIcon}>✏️</Text>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Rename Workout</Text>
                <Text style={styles.menuSub}>Customize the title of this session</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Add Exercise */}
          {onAddExercise && (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                onClose();
                onAddExercise();
              }}
            >
              <Text style={styles.menuIcon}>➕</Text>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Add Exercise</Text>
                <Text style={styles.menuSub}>Insert a movement into this session</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Mark All Sets Completed */}
          {onMarkAllDone && (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                onClose();
                onMarkAllDone();
              }}
            >
              <Text style={styles.menuIcon}>✅</Text>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Mark All Sets Completed</Text>
                <Text style={styles.menuSub}>Check off every set currently planned</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Pause / Resume */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              onTogglePause();
              onClose();
            }}
          >
            <Text style={styles.menuIcon}>{isPaused ? '▶️' : '⏸️'}</Text>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{isPaused ? 'Resume Workout' : 'Pause Workout'}</Text>
              <Text style={styles.menuSub}>Temporarily pause the duration timer</Text>
            </View>
          </TouchableOpacity>

          {/* Minimize */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              onClose();
              onMinimize();
            }}
          >
            <Text style={styles.menuIcon}>🔽</Text>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Minimize Workout</Text>
              <Text style={styles.menuSub}>Keep timer ticking in floating mini-bar</Text>
            </View>
          </TouchableOpacity>

          {/* Complete */}
          <TouchableOpacity
            style={[styles.menuRow, styles.completeRow]}
            onPress={() => {
              onClose();
              onComplete();
            }}
          >
            <Text style={styles.menuIcon}>🏁</Text>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: '#22c55e' }]}>Complete Workout</Text>
              <Text style={styles.menuSub}>Finish session and view muscle volume summary</Text>
            </View>
          </TouchableOpacity>

          {/* Discard */}
          <TouchableOpacity style={[styles.menuRow, styles.discardRow]} onPress={handleConfirmDiscard}>
            <Text style={styles.menuIcon}>🗑️</Text>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: '#ef4444' }]}>Discard Workout</Text>
              <Text style={styles.menuSub}>End workout without saving</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1b1d22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: '#2b2e38',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444955',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252832',
  },
  completeRow: {
    borderBottomColor: '#252832',
  },
  discardRow: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 20,
    width: 36,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 12,
    color: '#7b828f',
  },
});
