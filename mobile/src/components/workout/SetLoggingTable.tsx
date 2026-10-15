import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
  onDeleteSet?: (setIdx: number) => void;
  onSetTypeChange?: (setIdx: number, type: SetType) => void;
}

export const SetLoggingTable: React.FC<SetLoggingTableProps> = ({
  sets,
  activeSetIndex,
  activeFieldType,
  unit = 'Lb',
  onFocusField,
  onToggleComplete,
  onAddSet,
  onSetTypeChange,
}) => {
  const handleCycleType = (idx: number, currentType: SetType = 'normal') => {
    if (!onSetTypeChange) return;
    const types: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
    const nextIdx = (types.indexOf(currentType) + 1) % types.length;
    onSetTypeChange(idx, types[nextIdx]);
  };

  return (
    <View style={styles.container}>
      {/* Table Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { width: 38, textAlign: 'center' }]}>Set</Text>
        <Text style={[styles.headerCell, { flex: 1.2 }]}>Previous / Target</Text>
        <Text style={[styles.headerCell, { width: 70, textAlign: 'center' }]}>{unit}</Text>
        <Text style={[styles.headerCell, { width: 70, textAlign: 'center' }]}>Reps</Text>
        <Text style={[styles.headerCell, { width: 44, textAlign: 'center' }]}>✓</Text>
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
            {/* Set Number / Type Circle (Tap to cycle: Work -> Warmup -> Drop -> Failure) */}
            <TouchableOpacity
              style={[
                styles.setCircle,
                setType === 'warmup' && styles.setCircleWarmup,
                setType === 'drop' && styles.setCircleDrop,
                setType === 'failure' && styles.setCircleFailure,
                s.isCompleted && styles.setCircleCompleted,
              ]}
              onPress={() => handleCycleType(idx, setType)}
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

            {/* Target / Previous Performance (Ghost info) */}
            <View style={styles.targetCol}>
              {s.previousPerformance ? (
                <Text style={styles.previousGhostText} numberOfLines={1}>
                  Last: {s.previousPerformance}
                </Text>
              ) : null}
              <Text style={styles.targetText} numberOfLines={1}>
                {s.targetReps || '8-10 reps'}
                {s.targetRir !== undefined ? ` • ${s.targetRir} RIR` : ''}
              </Text>
            </View>

            {/* Weight Input Box */}
            <TouchableOpacity
              style={[styles.inputPill, isWeightFocused && styles.inputPillFocused]}
              onPress={() => onFocusField(idx, 'weight')}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, isWeightFocused && styles.inputTextFocused]}>
                {s.weight > 0 ? s.weight : '-'}
              </Text>
            </TouchableOpacity>

            {/* Reps Input Box */}
            <TouchableOpacity
              style={[styles.inputPill, isRepsFocused && styles.inputPillFocused]}
              onPress={() => onFocusField(idx, 'reps')}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, isRepsFocused && styles.inputTextFocused]}>
                {s.reps > 0 ? s.reps : '-'}
              </Text>

              {/* RIR indicator bubble if specified */}
              {s.targetRir !== undefined && (
                <View style={[styles.rirBubble, { backgroundColor: s.targetRir <= 1 ? '#e74c3c' : '#f39c12' }]}>
                  <Text style={styles.rirBubbleText}>{s.targetRir}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Completion Checkbox */}
            <TouchableOpacity
              style={[styles.checkbox, s.isCompleted && styles.checkboxCompleted]}
              onPress={() => onToggleComplete(idx)}
              activeOpacity={0.6}
            >
              {s.isCompleted && <Text style={styles.checkmarkIcon}>✓</Text>}
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Add Set Row Button */}
      <TouchableOpacity style={styles.addSetRow} onPress={onAddSet} activeOpacity={0.7}>
        <Text style={styles.addSetPlus}>+</Text>
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121418',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#20232a',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#767e8c',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1d24',
  },
  rowCompleted: {
    opacity: 0.85,
  },
  setCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#20232b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  setCircleCompleted: {
    backgroundColor: '#1b3323',
  },
  setText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b93a2',
  },
  setTextCompleted: {
    color: '#4cd964',
  },
  setCircleWarmup: {
    backgroundColor: '#3b2812',
    borderColor: '#d97706',
  },
  setTextWarmup: {
    color: '#fbbf24',
    fontWeight: '900',
  },
  setCircleDrop: {
    backgroundColor: '#321945',
    borderColor: '#a855f7',
  },
  setTextDrop: {
    color: '#c084fc',
    fontWeight: '900',
  },
  setCircleFailure: {
    backgroundColor: '#40151c',
    borderColor: '#ef4444',
  },
  setTextFailure: {
    color: '#f87171',
    fontWeight: '900',
  },
  targetCol: {
    flex: 1.2,
  },
  previousGhostText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: 1,
  },
  targetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#818a99',
  },
  rirText: {
    fontSize: 10,
    color: '#656b78',
    marginTop: 1,
  },
  inputPill: {
    width: 70,
    height: 38,
    backgroundColor: '#1d2028',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#262a34',
  },
  inputPillFocused: {
    borderColor: '#4b88eb',
    backgroundColor: '#19263a',
  },
  inputText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  inputTextFocused: {
    color: '#7ba9f5',
  },
  rirBubble: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rirBubbleText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#393f4e',
    backgroundColor: '#181b22',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  checkboxCompleted: {
    backgroundColor: '#27ae60',
    borderColor: '#2ecc71',
  },
  checkmarkIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addSetPlus: {
    fontSize: 18,
    color: '#4b88eb',
    fontWeight: '800',
  },
  addSetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b88eb',
  },
});
