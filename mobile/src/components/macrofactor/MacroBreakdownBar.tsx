import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface MacroBreakdownBarProps {
  proteinLogged: number;
  proteinTarget: number;
  fatsLogged: number;
  fatsTarget: number;
  carbsLogged: number;
  carbsTarget: number;
  mode?: 'consumed' | 'remaining';
}

export const MacroBreakdownBar: React.FC<MacroBreakdownBarProps> = ({
  proteinLogged = 0,
  proteinTarget = 160,
  fatsLogged = 0,
  fatsTarget = 70,
  carbsLogged = 0,
  carbsTarget = 250,
  mode = 'consumed',
}) => {
  const renderMacro = (
    name: string,
    current: number,
    target: number,
    barColor: string
  ) => {
    const remaining = Math.max(0, target - current);
    const displayText =
      mode === 'consumed'
        ? `${current} / ${target}g`
        : `${remaining}g left`;

    return (
      <View style={styles.macroCol}>
        <View style={[styles.colorLine, { backgroundColor: barColor }]} />
        <Text style={styles.macroName}>{name}</Text>
        <Text style={styles.macroValue}>{displayText}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderMacro('Protein', proteinLogged, proteinTarget, colors.accentOrange)}
      {renderMacro('Fat', fatsLogged, fatsTarget, colors.accentYellow)}
      {renderMacro('Carbs', carbsLogged, carbsTarget, colors.accentGreen)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
    gap: 12,
  },
  macroCol: {
    flex: 1,
    alignItems: 'center',
  },
  colorLine: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },
  macroName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
    letterSpacing: -0.2,
  },
});
