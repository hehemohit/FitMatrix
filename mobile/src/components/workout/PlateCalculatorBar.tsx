import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { calculateBarbellPlates } from '../../utils/plateMath';

interface PlateCalculatorBarProps {
  weight: number;
  barWeight?: number;
  unit?: 'lb' | 'kg';
}

const PLATE_COLORS: Record<number, string> = {
  55: '#d32f2f', // Red
  45: '#1976d2', // Blue
  35: '#fbc02d', // Yellow
  25: '#388e3c', // Green
  20: '#1976d2',
  15: '#fbc02d',
  10: '#424242', // Black/dark grey
  5: '#757575',
  2.5: '#9e9e9e',
};

export const PlateCalculatorBar: React.FC<PlateCalculatorBarProps> = ({
  weight,
  barWeight = 45,
  unit = 'lb',
}) => {
  if (weight <= barWeight) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Bar only ({barWeight} {unit})</Text>
      </View>
    );
  }

  const result = calculateBarbellPlates(weight, barWeight);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {result.platePairs.map((p, idx) => {
          const color = PLATE_COLORS[p.weight] || '#555';
          return (
            <View key={`plate_${idx}`} style={[styles.plateBadge, { borderColor: color }]}>
              <View style={[styles.plateDot, { backgroundColor: color }]} />
              <Text style={styles.plateText}>
                {p.count} × {p.weight}
              </Text>
            </View>
          );
        })}
        <Text style={styles.summaryText}>
          ({result.weightPerSide} {unit}/side + {barWeight} {unit} bar)
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16181d',
    borderTopWidth: 1,
    borderTopColor: '#252932',
    borderBottomWidth: 1,
    borderBottomColor: '#252932',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f222a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  plateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e0e4ec',
  },
  summaryText: {
    fontSize: 11,
    color: '#767e8c',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 11,
    color: '#767e8c',
    textAlign: 'center',
  },
});
