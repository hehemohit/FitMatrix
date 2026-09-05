import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string; // emoji icon
  accent?: string; // hex colour for the value
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  icon,
  accent = '#1a73e8',
}) => (
  <View style={styles.tile}>
    {icon ? <Text style={styles.icon}>{icon}</Text> : null}
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, { color: accent }]}>
      {value}
      {unit ? <Text style={styles.unit}> {unit}</Text> : null}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 4,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  unit: {
    fontSize: 13,
    fontWeight: '400',
    color: '#888',
  },
});
