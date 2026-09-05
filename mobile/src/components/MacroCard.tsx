import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  colour: string;
}

const MacroBar: React.FC<MacroBarProps> = ({ label, current, target, colour }) => {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colour }]} />
      </View>
      <Text style={styles.macroValue}>
        {current}<Text style={styles.macroTarget}>/{target}g</Text>
      </Text>
    </View>
  );
};

interface MacroCardProps {
  /** Logged amounts */
  proteinLogged?: number;
  carbsLogged?: number;
  fatsLogged?: number;
  caloriesLogged?: number;
  /** Targets */
  proteinTarget?: number;
  carbsTarget?: number;
  fatsTarget?: number;
  caloriesTarget?: number;
}

export const MacroCard: React.FC<MacroCardProps> = ({
  proteinLogged = 0,
  carbsLogged = 0,
  fatsLogged = 0,
  caloriesLogged = 0,
  proteinTarget = 160,
  carbsTarget = 250,
  fatsTarget = 70,
  caloriesTarget = 2400,
}) => {
  const calPct = caloriesTarget > 0 ? Math.min((caloriesLogged / caloriesTarget) * 100, 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nutrition Today</Text>
        <Text style={styles.calValue}>
          {caloriesLogged}
          <Text style={styles.calTarget}> / {caloriesTarget} kcal</Text>
        </Text>
      </View>

      {/* Calorie ring track */}
      <View style={styles.calTrack}>
        <View style={[styles.calFill, { width: `${calPct}%` }]} />
      </View>

      <MacroBar
        label="Protein"
        current={proteinLogged}
        target={proteinTarget}
        colour="#4CAF50"
      />
      <MacroBar
        label="Carbs"
        current={carbsLogged}
        target={carbsTarget}
        colour="#FF9800"
      />
      <MacroBar
        label="Fats"
        current={fatsLogged}
        target={fatsTarget}
        colour="#E91E63"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  calValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a73e8',
  },
  calTarget: {
    fontSize: 12,
    fontWeight: '400',
    color: '#888',
  },
  calTrack: {
    height: 6,
    backgroundColor: '#e8f0fe',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  calFill: {
    height: 6,
    backgroundColor: '#1a73e8',
    borderRadius: 3,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    width: 56,
    fontSize: 12,
    color: '#666',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  macroValue: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
    textAlign: 'right',
  },
  macroTarget: {
    fontWeight: '400',
    color: '#aaa',
  },
});
