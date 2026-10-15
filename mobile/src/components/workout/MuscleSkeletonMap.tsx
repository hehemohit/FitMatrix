import React from 'react';
import { View, Text, StyleSheet, UIManager, Platform } from 'react-native';
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

// Check if native SVG module is registered in the current APK
const isNativeSvgAvailable = () => {
  try {
    return !!(
      UIManager.hasViewManagerConfig?.('RNSVGCircle') ||
      UIManager.hasViewManagerConfig?.('RNSvgView') ||
      UIManager.hasViewManagerConfig?.('RCTRNSVGCircle')
    );
  } catch {
    return false;
  }
};

/**
 * Fallback pure-View anatomical silhouette that works on any APK build
 * without requiring native SVG ViewManager linking.
 */
const ViewBasedMuscleFigure: React.FC<{
  type: 'front' | 'back';
  highlightedMuscles: Record<MuscleKey, number> | MuscleKey[];
  secondaryMuscles: MuscleKey[];
  activeColor: string;
  secondaryColor: string;
  baseColor: string;
  width: number;
  height: number;
}> = ({ type, highlightedMuscles, secondaryMuscles, activeColor, secondaryColor, baseColor, width, height }) => {
  const isHigh = (k: MuscleKey) => {
    if (Array.isArray(highlightedMuscles)) return highlightedMuscles.includes(k);
    return (highlightedMuscles[k] || 0) > 0;
  };

  const getCol = (k: MuscleKey) => {
    if (isHigh(k)) return activeColor;
    if (secondaryMuscles.includes(k)) return secondaryColor;
    return baseColor;
  };

  const scale = width / 120;

  return (
    <View style={[styles.fallbackContainer, { width, height }]}>
      {/* Head */}
      <View style={[styles.fbHead, { backgroundColor: baseColor, width: 20 * scale, height: 20 * scale, borderRadius: 10 * scale }]} />

      {/* Shoulders & Upper Body */}
      <View style={styles.fbRow}>
        {/* Left Arm */}
        <View style={styles.fbArmCol}>
          <View style={[styles.fbMusclePill, { backgroundColor: getCol(type === 'front' ? 'front_delts' : 'rear_delts'), width: 14 * scale, height: 16 * scale }]} />
          <View style={[styles.fbMusclePill, { backgroundColor: getCol(type === 'front' ? 'biceps' : 'triceps'), width: 12 * scale, height: 22 * scale }]} />
          <View style={[styles.fbMusclePill, { backgroundColor: getCol('forearms'), width: 10 * scale, height: 26 * scale }]} />
        </View>

        {/* Torso Center */}
        <View style={[styles.fbTorsoCol, { width: 44 * scale }]}>
          {type === 'front' ? (
            <>
              {/* Chest Left & Right */}
              <View style={styles.fbChestRow}>
                <View style={[styles.fbChestBlock, { backgroundColor: getCol('chest'), width: 20 * scale, height: 18 * scale }]} />
                <View style={[styles.fbChestBlock, { backgroundColor: getCol('chest'), width: 20 * scale, height: 18 * scale }]} />
              </View>
              {/* 6-Pack Abs */}
              <View style={[styles.fbAbsGrid, { backgroundColor: getCol('abs'), height: 34 * scale }]}>
                <View style={styles.fbAbsInnerRow}>
                  <View style={styles.fbAbCell} />
                  <View style={styles.fbAbCell} />
                </View>
                <View style={styles.fbAbsInnerRow}>
                  <View style={styles.fbAbCell} />
                  <View style={styles.fbAbCell} />
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Upper Back / Traps */}
              <View style={[styles.fbTrapsBlock, { backgroundColor: getCol('traps'), width: 40 * scale, height: 20 * scale }]} />
              {/* Lats */}
              <View style={[styles.fbLatsBlock, { backgroundColor: getCol('lats'), width: 38 * scale, height: 20 * scale }]} />
              {/* Lower Back */}
              <View style={[styles.fbLowerBackBlock, { backgroundColor: getCol('lower_back'), width: 32 * scale, height: 12 * scale }]} />
            </>
          )}
        </View>

        {/* Right Arm */}
        <View style={styles.fbArmCol}>
          <View style={[styles.fbMusclePill, { backgroundColor: getCol(type === 'front' ? 'front_delts' : 'rear_delts'), width: 14 * scale, height: 16 * scale }]} />
          <View style={[styles.fbMusclePill, { backgroundColor: getCol(type === 'front' ? 'biceps' : 'triceps'), width: 12 * scale, height: 22 * scale }]} />
          <View style={[styles.fbMusclePill, { backgroundColor: getCol('forearms'), width: 10 * scale, height: 26 * scale }]} />
        </View>
      </View>

      {/* Hips / Glutes */}
      {type === 'back' && (
        <View style={styles.fbGlutesRow}>
          <View style={[styles.fbGluteBlock, { backgroundColor: getCol('glutes'), width: 20 * scale, height: 18 * scale }]} />
          <View style={[styles.fbGluteBlock, { backgroundColor: getCol('glutes'), width: 20 * scale, height: 18 * scale }]} />
        </View>
      )}

      {/* Legs */}
      <View style={styles.fbLegsRow}>
        {/* Left Leg */}
        <View style={styles.fbLegCol}>
          <View style={[styles.fbThighBlock, { backgroundColor: getCol(type === 'front' ? 'quads' : 'hamstrings'), width: 18 * scale, height: 42 * scale }]} />
          <View style={[styles.fbCalfBlock, { backgroundColor: getCol(type === 'front' ? 'calves_front' : 'calves_back'), width: 14 * scale, height: 36 * scale }]} />
        </View>

        {/* Right Leg */}
        <View style={styles.fbLegCol}>
          <View style={[styles.fbThighBlock, { backgroundColor: getCol(type === 'front' ? 'quads' : 'hamstrings'), width: 18 * scale, height: 42 * scale }]} />
          <View style={[styles.fbCalfBlock, { backgroundColor: getCol(type === 'front' ? 'calves_front' : 'calves_back'), width: 14 * scale, height: 36 * scale }]} />
        </View>
      </View>
    </View>
  );
};

export const MuscleSkeletonMap: React.FC<MuscleSkeletonMapProps> = ({
  highlightedMuscles = [],
  secondaryMuscles = [],
  activeColor = '#4b88eb',
  secondaryColor = '#4b88eb55',
  baseColor = '#22252a',
  outlineColor = '#343842',
  viewMode = 'both',
  width = 130,
  height = 220,
  showLabels = true,
  onMusclePress,
}) => {
  const hasSvg = isNativeSvgAvailable();

  return (
    <View style={styles.container}>
      {(viewMode === 'both' || viewMode === 'front') && (
        <View style={styles.figureWrapper}>
          {hasSvg ? (
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
          ) : (
            <ViewBasedMuscleFigure
              type="front"
              highlightedMuscles={highlightedMuscles}
              secondaryMuscles={secondaryMuscles}
              activeColor={activeColor}
              secondaryColor={secondaryColor}
              baseColor={baseColor}
              width={width}
              height={height}
            />
          )}
          {showLabels && <Text style={styles.viewLabel}>ANTERIOR</Text>}
        </View>
      )}

      {(viewMode === 'both' || viewMode === 'back') && (
        <View style={styles.figureWrapper}>
          {hasSvg ? (
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
          ) : (
            <ViewBasedMuscleFigure
              type="back"
              highlightedMuscles={highlightedMuscles}
              secondaryMuscles={secondaryMuscles}
              activeColor={activeColor}
              secondaryColor={secondaryColor}
              baseColor={baseColor}
              width={width}
              height={height}
            />
          )}
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
    paddingVertical: 10,
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
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fbHead: {
    marginBottom: 4,
  },
  fbRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 3,
  },
  fbArmCol: {
    alignItems: 'center',
    gap: 2,
  },
  fbMusclePill: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30343e',
  },
  fbTorsoCol: {
    alignItems: 'center',
    gap: 2,
  },
  fbChestRow: {
    flexDirection: 'row',
    gap: 2,
  },
  fbChestBlock: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30343e',
  },
  fbAbsGrid: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30343e',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  fbAbsInnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fbAbCell: {
    width: 14,
    height: 8,
    backgroundColor: '#00000022',
    borderRadius: 2,
  },
  fbTrapsBlock: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30343e',
  },
  fbLatsBlock: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30343e',
  },
  fbLowerBackBlock: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#30343e',
  },
  fbGlutesRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  fbGluteBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30343e',
  },
  fbLegsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  fbLegCol: {
    alignItems: 'center',
    gap: 3,
  },
  fbThighBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30343e',
  },
  fbCalfBlock: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30343e',
  },
});
