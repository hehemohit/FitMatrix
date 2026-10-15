import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { MUSCLE_ANATOMY_GEOMETRY } from '../../constants/muscleAnatomyGeometry';

export type MuscleAnatomyKey =
  | 'trapezius'
  | 'deltoids'
  | 'chest'
  | 'upper-back'
  | 'serratus'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'abs'
  | 'obliques'
  | 'lower-back'
  | 'gluteal'
  | 'quadriceps'
  | 'hamstring'
  | 'adductors'
  | 'hip-flexors'
  | 'calves'
  | 'tibialis';

export const INERT_BODY_PARTS = new Set([
  'head',
  'hair',
  'neck',
  'hands',
  'feet',
  'knees',
  'ankles',
]);

export interface MuscleHeatMap {
  [muscleKey: string]: number | undefined; // intensity 0 to 1, or number of sets
}

interface AnatomicalSilhouetteProps {
  gender?: 'male' | 'female';
  heatMap?: MuscleHeatMap;
  selectedMuscle?: string | null;
  onSelectMuscle?: (muscle: string) => void;
  width?: number;
  height?: number;
  mode?: 'balance' | 'fatigue' | 'strength';
}

const DEFAULT_INERT_COLOR = '#2e3344';
const DEFAULT_UNFOCUSED_COLOR = '#1d212c';
const DEFAULT_STROKE_COLOR = '#2e3344';

export const AnatomicalSilhouette: React.FC<AnatomicalSilhouetteProps> = ({
  gender = 'male',
  heatMap = {},
  selectedMuscle = null,
  onSelectMuscle,
  width = Dimensions.get('window').width - 48,
  height = 240,
  mode = 'balance',
}) => {
  const genderData = MUSCLE_ANATOMY_GEOMETRY[gender] || MUSCLE_ANATOMY_GEOMETRY.male;
  const frontView = genderData.front;
  const backView = genderData.back;

  // Compute color based on intensity / mode
  const getMuscleColor = (muscleKey: string) => {
    if (INERT_BODY_PARTS.has(muscleKey)) {
      return DEFAULT_INERT_COLOR;
    }

    const intensity = heatMap[muscleKey] ?? 0;
    const isSelected = selectedMuscle === muscleKey;

    if (isSelected) {
      return '#3b82f6'; // Bright electric blue when specifically tapped
    }

    if (intensity <= 0) {
      return DEFAULT_UNFOCUSED_COLOR;
    }

    if (mode === 'fatigue') {
      // Scale from green (fresh) to orange (recovering) to red (fatigued)
      if (intensity > 8) return '#ef4444'; // Red (exhausted)
      if (intensity > 4) return '#f59e0b'; // Amber (fatigued)
      return '#10b981'; // Green (recovering well)
    }

    if (mode === 'strength') {
      // Electric cyan / purple strength tier
      if (intensity > 8) return '#06b6d4';
      if (intensity > 4) return '#3b82f6';
      return '#6366f1';
    }

    // Default: Muscle balance (Neon Green heatmap matching reference screenshot)
    if (intensity >= 8) return '#4ade80'; // Brightest neon lime
    if (intensity >= 4) return '#22c55e'; // Vibrant neon green
    if (intensity >= 1) return '#16a34a'; // Mid-tier green
    return '#15803d'; // Deep green
  };

  const halfWidth = width / 2;

  const renderViewPaths = (
    viewData: { vb: string; p: Record<string, string[]> },
    isFront: boolean
  ) => {
    return (
      <Svg
        width={halfWidth}
        height={height}
        viewBox={viewData.vb}
        preserveAspectRatio="xMidYMid meet"
      >
        {Object.entries(viewData.p).map(([key, paths]) => {
          const fillColor = getMuscleColor(key);
          const isInert = INERT_BODY_PARTS.has(key);
          return (
            <G key={`${isFront ? 'front' : 'back'}-${key}`}>
              {paths.map((d, index) => (
                <Path
                  key={index}
                  d={d}
                  fill={fillColor}
                  stroke={isInert ? '#222633' : DEFAULT_STROKE_COLOR}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  onPress={
                    onSelectMuscle && !isInert ? () => onSelectMuscle(key) : undefined
                  }
                />
              ))}
            </G>
          );
        })}
      </Svg>
    );
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Front Body View */}
      <View style={styles.viewHalf}>{renderViewPaths(frontView, true)}</View>

      {/* Back Body View */}
      <View style={styles.viewHalf}>{renderViewPaths(backView, false)}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  viewHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AnatomicalSilhouette;
