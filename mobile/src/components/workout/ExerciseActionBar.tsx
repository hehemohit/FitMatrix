import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface ExerciseActionBarProps {
  onOpenInfo: () => void;
  onOpenWarmUp: () => void;
  onOpenTargets: () => void;
  onOpenSwap: () => void;
  onOpenSmartProgression: () => void;
}

export const ExerciseActionBar: React.FC<ExerciseActionBarProps> = ({
  onOpenInfo,
  onOpenWarmUp,
  onOpenTargets,
  onOpenSwap,
  onOpenSmartProgression,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Smart Progression Wand */}
        <TouchableOpacity style={styles.actionPill} onPress={onOpenSmartProgression}>
          <Text style={styles.pillIcon}>🪄</Text>
          <View style={styles.blueDot} />
        </TouchableOpacity>

        {/* Info & Video GIF */}
        <TouchableOpacity style={styles.actionPill} onPress={onOpenInfo}>
          <Text style={styles.pillIcon}>ℹ️</Text>
          <Text style={styles.pillText}>Info</Text>
        </TouchableOpacity>

        {/* Warm Up */}
        <TouchableOpacity style={styles.actionPill} onPress={onOpenWarmUp}>
          <Text style={styles.pillIcon}>🔥</Text>
          <Text style={styles.pillText}>Warm Up</Text>
        </TouchableOpacity>

        {/* Targets */}
        <TouchableOpacity style={styles.actionPill} onPress={onOpenTargets}>
          <Text style={styles.pillIcon}>🎯</Text>
          <Text style={styles.pillText}>Targets</Text>
        </TouchableOpacity>

        {/* Swap Movement */}
        <TouchableOpacity style={styles.actionPill} onPress={onOpenSwap}>
          <Text style={styles.pillIcon}>🔄</Text>
          <Text style={styles.pillText}>Swap</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121418',
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1f26',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2b303d',
  },
  pillIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d2d6df',
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4b88eb',
    marginLeft: 2,
  },
});
