import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { PlateCalculatorBar } from './PlateCalculatorBar';

interface CustomWorkoutKeypadProps {
  currentWeight?: number;
  activeFieldType?: 'weight' | 'reps';
  onKeyPress: (val: string) => void;
  onBackspace: () => void;
  onIncrement: (delta: number) => void;
  onNext: () => void;
  onDone?: () => void;
  barWeight?: number;
}

export const CustomWorkoutKeypad: React.FC<CustomWorkoutKeypadProps> = ({
  currentWeight = 0,
  activeFieldType = 'weight',
  onKeyPress,
  onBackspace,
  onIncrement,
  onNext,
  onDone,
  barWeight = 45,
}) => {
  return (
    <View style={styles.container}>
      {/* Plate Calculator Ribbon (visible when editing weight) */}
      {activeFieldType === 'weight' && currentWeight > 0 && (
        <PlateCalculatorBar weight={currentWeight} barWeight={barWeight} />
      )}

      {/* Number Grid */}
      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('1')} activeOpacity={0.6}>
            <Text style={styles.keyText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('2')} activeOpacity={0.6}>
            <Text style={styles.keyText}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('3')} activeOpacity={0.6}>
            <Text style={styles.keyText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.keyBtn, styles.actionKeyBtn]} onPress={onBackspace} activeOpacity={0.6}>
            <Text style={styles.actionKeyText}>⌫</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('4')} activeOpacity={0.6}>
            <Text style={styles.keyText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('5')} activeOpacity={0.6}>
            <Text style={styles.keyText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('6')} activeOpacity={0.6}>
            <Text style={styles.keyText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.keyBtn, styles.deltaKeyBtn]} onPress={() => onIncrement(activeFieldType === 'weight' ? 5 : 1)} activeOpacity={0.6}>
            <Text style={styles.deltaKeyText}>{activeFieldType === 'weight' ? '+5' : '+1'}</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('7')} activeOpacity={0.6}>
            <Text style={styles.keyText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('8')} activeOpacity={0.6}>
            <Text style={styles.keyText}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('9')} activeOpacity={0.6}>
            <Text style={styles.keyText}>9</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.keyBtn, styles.deltaKeyBtn]} onPress={() => onIncrement(activeFieldType === 'weight' ? -5 : -1)} activeOpacity={0.6}>
            <Text style={styles.deltaKeyText}>{activeFieldType === 'weight' ? '-5' : '-1'}</Text>
          </TouchableOpacity>
        </View>

        {/* Row 4 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('.')} activeOpacity={0.6}>
            <Text style={styles.keyText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtn} onPress={() => onKeyPress('0')} activeOpacity={0.6}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.keyBtn, styles.microKeyBtn]}
            onPress={() => onIncrement(activeFieldType === 'weight' ? 2.5 : 1)}
            activeOpacity={0.6}
          >
            <Text style={styles.microKeyText}>{activeFieldType === 'weight' ? '+2.5' : 'Done'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.keyBtn, styles.nextKeyBtn]} onPress={onNext} activeOpacity={0.6}>
            <Text style={styles.nextKeyText}>➔</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121418',
    borderTopWidth: 1,
    borderTopColor: '#22252c',
    paddingBottom: 6,
  },
  grid: {
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  keyBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#1d2027',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  actionKeyBtn: {
    backgroundColor: '#262a34',
  },
  actionKeyText: {
    fontSize: 18,
    color: '#e0e5ee',
  },
  deltaKeyBtn: {
    backgroundColor: '#1f2533',
  },
  deltaKeyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7ba9f5',
  },
  microKeyBtn: {
    backgroundColor: '#1f2533',
  },
  microKeyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7ba9f5',
  },
  nextKeyBtn: {
    backgroundColor: '#4b88eb',
  },
  nextKeyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
});
