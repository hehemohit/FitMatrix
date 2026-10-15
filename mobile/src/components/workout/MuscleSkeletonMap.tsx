import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AnatomicalBodyFront } from './AnatomicalBodyFront';
import { AnatomicalBodyBack } from './AnatomicalBodyBack';
import { MuscleKey } from '../../utils/muscleTargetMapper';
import { colors } from '../../theme/colors';

export interface MuscleSkeletonMapProps {
  highlightedMuscles?: Record<MuscleKey, number> | MuscleKey[];
  secondaryMuscles?: MuscleKey[];
  activeColor?: string;
  secondaryColor?: string;
  baseColor?: string;
  outlineColor?: string;
  viewMode?: 'both' | 'front' | 'back';
  width?: number;
  height?: number;
  showLabels?: boolean;
  onMusclePress?: (key: MuscleKey) => void;
}

export const MuscleSkeletonMap: React.FC<MuscleSkeletonMapProps> = ({
  highlightedMuscles = [],
  secondaryMuscles = [],
  activeColor = '#4b88eb',
  secondaryColor = '#4b88eb55',
  baseColor = '#22252a',
  outlineColor = '#343842',
  viewMode = 'both',
  width = 135,
  height = 230,
  showLabels = true,
  onMusclePress,
}) => {
  return (
    <View style={styles.container}>
      {(viewMode === 'both' || viewMode === 'front') && (
        <View style={styles.figureWrapper}>
          <AnatomicalBodyFront
            highlightedMuscles={highlightedMuscles}
            secondaryMuscles={secondaryMuscles}
            activeColor={activeColor}
            secondaryColor={secondaryColor}
            baseColor={baseColor}
            outlineColor={outlineColor}
            width={width}
            height={height}
            onMusclePress={onMusclePress}
          />
          {showLabels && <Text style={styles.viewLabel}>ANTERIOR</Text>}
        </View>
      )}

      {(viewMode === 'both' || viewMode === 'back') && (
        <View style={styles.figureWrapper}>
          <AnatomicalBodyBack
            highlightedMuscles={highlightedMuscles}
            secondaryMuscles={secondaryMuscles}
            activeColor={activeColor}
            secondaryColor={secondaryColor}
            baseColor={baseColor}
            outlineColor={outlineColor}
            width={width}
            height={height}
            onMusclePress={onMusclePress}
          />
          {showLabels && <Text style={styles.viewLabel}>POSTERIOR</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  figureWrapper: {
    alignItems: 'center',
  },
  viewLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textSecondary || '#8a919e',
  },
});
