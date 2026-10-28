import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../theme/colors';

interface CalorieArcGaugeProps {
  consumed: number;
  target: number;
  mode?: 'consumed' | 'remaining';
  onToggleMode?: () => void;
}

const GAUGE_RADIUS = 88; // Total diameter = 176
const STROKE_WIDTH = 9;  // Ring stroke width
const INNER_RADIUS = GAUGE_RADIUS - STROKE_WIDTH; // 79, diameter = 158

export const CalorieArcGauge: React.FC<CalorieArcGaugeProps> = ({
  consumed,
  target,
  mode = 'consumed',
  onToggleMode,
}) => {
  const safeTarget = target > 0 ? target : Math.max(consumed, 1);
  const remaining = Math.max(0, safeTarget - consumed);

  // Values depending on active mode
  const currentMetric = mode === 'consumed' ? consumed : remaining;
  const currentLabel = mode === 'consumed' ? 'Consumed' : 'Remaining';

  const sideValue = mode === 'consumed' ? remaining : consumed;
  const sideLabel = mode === 'consumed' ? 'Remaining' : 'Consumed';

  // Calculate percentage of target
  const rawPercent = (currentMetric / safeTarget) * 100;
  const clampedPercent = Math.max(0, Math.min(100, rawPercent));

  // Determine progress color
  const isOverBudget = consumed > safeTarget;
  const progressColor = mode === 'consumed'
    ? (isOverBudget ? colors.accentOrange : colors.accentBlue)
    : (remaining > 0 ? colors.accentGreen : colors.accentOrange);

  const trackColor = '#25262a';

  // Animated states
  const animValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [displayNumber, setDisplayNumber] = useState(0);

  // Track previous target to animate smoothly from last value
  const prevPercentRef = useRef(0);
  const prevNumberRef = useRef(0);

  useEffect(() => {
    const startPercent = prevPercentRef.current;
    const endPercent = clampedPercent;

    const startNum = prevNumberRef.current;
    const endNum = currentMetric;

    animValue.setValue(0);

    const listenerId = animValue.addListener(({ value }) => {
      // Interpolate percent
      const currentP = startPercent + (endPercent - startPercent) * value;
      setAnimatedPercent(currentP);

      // Interpolate calorie count
      const currentN = Math.round(startNum + (endNum - startNum) * value);
      setDisplayNumber(currentN);
    });

    Animated.parallel([
      Animated.timing(animValue, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      prevPercentRef.current = endPercent;
      prevNumberRef.current = endNum;
    });

    return () => {
      animValue.removeListener(listenerId);
    };
  }, [clampedPercent, currentMetric, animValue, scaleAnim]);

  // Pure-view circular arc angles based on Christoph Michel's geometry
  const p = Math.max(0, Math.min(100, animatedPercent));
  const needHalf2 = p > 50;
  const half1Degree = needHalf2 ? 180 : p * 3.6;
  const half2Degree = needHalf2 ? p * 3.6 : 0;

  const renderHalfCircle = (rotateDegrees: number, colorOverride?: string) => {
    return (
      <View
        style={[
          styles.leftWrap,
          {
            width: GAUGE_RADIUS * 2,
            height: GAUGE_RADIUS * 2,
          },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: GAUGE_RADIUS,
              height: GAUGE_RADIUS * 2,
              borderRadius: GAUGE_RADIUS,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              backgroundColor: colorOverride || progressColor,
              transform: [
                { translateX: GAUGE_RADIUS / 2 },
                { rotate: `${rotateDegrees}deg` },
                { translateX: -GAUGE_RADIUS / 2 },
              ],
            },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Left Metric Column */}
      <View style={styles.sideColumn}>
        <Text style={styles.sideValue}>{sideValue.toLocaleString()}</Text>
        <Text style={styles.sideLabel}>{sideLabel}</Text>
      </View>

      {/* Center Animated Arc Gauge */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onToggleMode}
        disabled={!onToggleMode}
        style={styles.touchWrapper}
      >
        <Animated.View style={[styles.gaugeWrapper, { transform: [{ scale: scaleAnim }] }]}>
          {/* Base outer circle with subtle dark track color */}
          <View
            style={[
              styles.outerCircle,
              {
                width: GAUGE_RADIUS * 2,
                height: GAUGE_RADIUS * 2,
                borderRadius: GAUGE_RADIUS,
                backgroundColor: trackColor,
              },
            ]}
          >
            {/* First half of circular progress (0 to 180 deg) */}
            {renderHalfCircle(half1Degree)}

            {/* Second half of circular progress (180 to 360 deg) */}
            {renderHalfCircle(half2Degree, needHalf2 ? progressColor : trackColor)}

            {/* Center cutout container */}
            <View
              style={[
                styles.innerCircle,
                {
                  width: INNER_RADIUS * 2,
                  height: INNER_RADIUS * 2,
                  borderRadius: INNER_RADIUS,
                  backgroundColor: colors.appDark,
                },
              ]}
            >
              <Text style={styles.centerValue}>{displayNumber.toLocaleString()}</Text>
              <Text style={styles.centerLabel}>{currentLabel}</Text>

              {/* Responsive Progress Percentage */}
              <View style={styles.percentBadge}>
                <Text style={[styles.percentText, { color: progressColor }]}>
                  {Math.round(rawPercent)}%
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Right Metric Column */}
      <View style={styles.sideColumn}>
        <Text style={styles.sideValue}>{safeTarget.toLocaleString()}</Text>
        <Text style={styles.sideLabel}>Target</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 14,
  },
  sideColumn: {
    flex: 1,
    alignItems: 'center',
  },
  sideValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  sideLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  touchWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  leftWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  innerCircle: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centerValue: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  centerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  percentBadge: {
    marginTop: 4,
    backgroundColor: '#ffffff0d',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
