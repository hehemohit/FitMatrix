import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { LoggedSet, SetType } from '../../store/useWorkoutSessionStore';

interface SetLoggingTableProps {
  sets: LoggedSet[];
  activeSetIndex: number;
  activeFieldType: 'weight' | 'reps';
  unit?: 'Lb' | 'Kg';
  onFocusField: (setIdx: number, field: 'weight' | 'reps') => void;
  onToggleComplete: (setIdx: number) => void;
  onAddSet: () => void;
  onAddWarmup?: () => void;
  onDeleteSet?: (setIdx: number) => void;
  onSetTypeChange?: (setIdx: number, type: SetType) => void;
  onIncrementField?: (setIdx: number, field: 'weight' | 'reps', delta: number) => void;
}

export const SetLoggingTable: React.FC<SetLoggingTableProps> = ({
  sets,
  activeSetIndex,
  activeFieldType,
  unit = 'Lb',
  onFocusField,
  onToggleComplete,
  onAddSet,
  onAddWarmup,
  onDeleteSet,
  onSetTypeChange,
  onIncrementField,
}) => {
  const [selectedSetForMenu, setSelectedSetForMenu] = useState<number | null>(null);

  const handleSelectSetType = (type: SetType) => {
    if (selectedSetForMenu !== null && onSetTypeChange) {
      onSetTypeChange(selectedSetForMenu, type);
    }
    setSelectedSetForMenu(null);
  };

  const handleDeleteCurrentSet = () => {
    if (selectedSetForMenu !== null && onDeleteSet) {
      onDeleteSet(selectedSetForMenu);
    }
    setSelectedSetForMenu(null);
  };

  return (
    <View style={styles.container}>
      {/* Table Header Row matching reference */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.colSet]}>SET</Text>
        <Text style={[styles.headerCell, styles.colPrev]}>PREV</Text>
        <Text style={[styles.headerCell, styles.colInput]}>{unit.toUpperCase()}</Text>
        <Text style={[styles.headerCell, styles.colInput]}>REPS</Text>
        <Text style={[styles.headerCell, styles.colCheck]}>✓</Text>
      </View>

      {/* Set Rows */}
      {sets.map((s, idx) => {
        const isCurrentSet = idx === activeSetIndex;
        const isWeightFocused = isCurrentSet && activeFieldType === 'weight';
        const isRepsFocused = isCurrentSet && activeFieldType === 'reps';
        const setType = s.type || 'normal';

        const setLabel =
          setType === 'warmup' ? 'W' :
          setType === 'drop' ? 'D' :
          setType === 'failure' ? 'F' :
          setType === 'rest_pause' ? 'RP' :
          String(s.setNumber);

        return (
          <View
            key={`set_${s.setNumber}_${idx}`}
            style={[styles.row, s.isCompleted && styles.rowCompleted]}
          >
            {/* Set Pill (Tap to open set options menu) */}
            <TouchableOpacity
              style={[
                styles.setCircle,
                setType === 'warmup' && styles.setCircleWarmup,
                setType === 'drop' && styles.setCircleDrop,
                setType === 'failure' && styles.setCircleFailure,
                s.isCompleted && styles.setCircleCompleted,
              ]}
              onPress={() => setSelectedSetForMenu(idx)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.setText,
                  setType === 'warmup' && styles.setTextWarmup,
                  setType === 'drop' && styles.setTextDrop,
                  setType === 'failure' && styles.setTextFailure,
                  s.isCompleted && styles.setTextCompleted,
                ]}
              >
                {setLabel}
              </Text>
            </TouchableOpacity>

            {/* Previous Session Performance */}
            <View style={styles.prevCol}>
              <Text style={styles.previousGhostText} numberOfLines={1}>
                {s.previousPerformance || '—'}
              </Text>
            </View>

            {/* Weight Input Box with quick steppers */}
            <View style={styles.stepperContainer}>
              {onIncrementField && (
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => onIncrementField(idx, 'weight', -5)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.inputPill, isWeightFocused && styles.inputPillFocused]}
                onPress={() => onFocusField(idx, 'weight')}
                activeOpacity={0.7}
              >
                <Text style={[styles.inputText, isWeightFocused && styles.inputTextFocused]}>
                  {s.weight > 0 ? s.weight : '—'}
                </Text>
              </TouchableOpacity>
              {onIncrementField && (
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => onIncrementField(idx, 'weight', 5)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Reps Input Box with quick steppers */}
            <View style={styles.stepperContainer}>
              {onIncrementField && (
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => onIncrementField(idx, 'reps', -1)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.inputPill, isRepsFocused && styles.inputPillFocused]}
                onPress={() => onFocusField(idx, 'reps')}
                activeOpacity={0.7}
              >
                <Text style={[styles.inputText, isRepsFocused && styles.inputTextFocused]}>
                  {s.reps > 0 ? s.reps : '—'}
                </Text>
              </TouchableOpacity>
              {onIncrementField && (
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => onIncrementField(idx, 'reps', 1)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Completion Checkmark Button */}
            <TouchableOpacity
              style={[styles.checkbox, s.isCompleted && styles.checkboxCompleted]}
              onPress={() => onToggleComplete(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.checkmarkIcon, s.isCompleted && styles.checkmarkIconCompleted]}>
                ✓
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Action Buttons Row */}
      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.addSetBtn} onPress={onAddSet} activeOpacity={0.7}>
          <Text style={styles.addSetBtnText}>+ Add set</Text>
        </TouchableOpacity>

        {onAddWarmup && (
          <TouchableOpacity style={styles.addWarmupBtn} onPress={onAddWarmup} activeOpacity={0.7}>
            <Text style={styles.addWarmupBtnText}>+ Warm-up</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Set Options Modal Sheet */}
      <Modal
        visible={selectedSetForMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSetForMenu(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedSetForMenu(null)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Set {selectedSetForMenu !== null ? selectedSetForMenu + 1 : ''} Options
            </Text>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectSetType('normal')}
            >
              <Text style={styles.menuOptionText}>Working Set</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectSetType('warmup')}
            >
              <Text style={styles.menuOptionText}>Warm-up Set (W)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectSetType('drop')}
            >
              <Text style={styles.menuOptionText}>Drop Set (D)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => handleSelectSetType('failure')}
            >
              <Text style={styles.menuOptionText}>Failure Set (F)</Text>
            </TouchableOpacity>

            {sets.length > 1 && (
              <TouchableOpacity
                style={[styles.menuOption, styles.menuOptionDanger]}
                onPress={handleDeleteCurrentSet}
              >
                <Text style={styles.menuOptionTextDanger}>Delete Set</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#12141c',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1f2433',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#202636',
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  colSet: {
    width: 34,
    textAlign: 'center',
  },
  colPrev: {
    flex: 1.1,
    paddingLeft: 6,
  },
  colInput: {
    width: 72,
    textAlign: 'center',
  },
  colCheck: {
    width: 40,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#181c28',
  },
  rowCompleted: {
    opacity: 0.9,
  },
  setCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1c202d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCircleCompleted: {
    backgroundColor: '#142c1d',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  setText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
  },
  setTextCompleted: {
    color: '#4ade80',
  },
  setCircleWarmup: {
    backgroundColor: '#38260d',
    borderWidth: 1,
    borderColor: '#eab308',
  },
  setTextWarmup: {
    color: '#facc15',
    fontWeight: '900',
  },
  setCircleDrop: {
    backgroundColor: '#301844',
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  setTextDrop: {
    color: '#c084fc',
    fontWeight: '900',
  },
  setCircleFailure: {
    backgroundColor: '#3b1313',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  setTextFailure: {
    color: '#f87171',
    fontWeight: '900',
  },
  prevCol: {
    flex: 1.1,
    paddingLeft: 6,
  },
  previousGhostText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  stepperContainer: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtn: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  inputPill: {
    backgroundColor: '#161922',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242a3a',
  },
  inputPillFocused: {
    borderColor: '#22c55e',
    backgroundColor: '#102217',
  },
  inputText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  inputTextFocused: {
    color: '#4ade80',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1a1e2b',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#2e3648',
  },
  checkboxCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmarkIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4b5563',
  },
  checkmarkIconCompleted: {
    color: '#000000',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  addSetBtn: {
    backgroundColor: '#1b202d',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#293044',
  },
  addSetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  addWarmupBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addWarmupBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242a3a',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },
  menuOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#202636',
  },
  menuOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  menuOptionDanger: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  menuOptionTextDanger: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
});

export default SetLoggingTable;
