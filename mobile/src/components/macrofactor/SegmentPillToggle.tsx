import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors } from '../../theme/colors';

interface SegmentPillToggleProps {
  mode?: 'consumed' | 'remaining';
  value?: 'consumed' | 'remaining';
  onToggle?: (val: 'consumed' | 'remaining') => void;
  onChange?: (val: 'consumed' | 'remaining') => void;
}

const SEGMENT_WIDTH = 104;
const SEGMENT_HEIGHT = 34;

export const SegmentPillToggle: React.FC<SegmentPillToggleProps> = ({
  mode,
  value,
  onToggle,
  onChange,
}) => {
  const currentMode = mode ?? value ?? 'consumed';
  const handleToggle = onToggle ?? onChange ?? (() => {});

  const isConsumed = currentMode === 'consumed';
  const targetX = isConsumed ? 0 : SEGMENT_WIDTH;

  const translateX = useRef(new Animated.Value(isConsumed ? 0 : SEGMENT_WIDTH)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: targetX,
        damping: 18,
        stiffness: 240,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [currentMode, targetX, translateX, scaleAnim]);

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.pillTrack, { transform: [{ scale: scaleAnim }] }]}>
        {/* Animated Sliding Highlight Pill */}
        <Animated.View
          style={[
            styles.slidingPill,
            { transform: [{ translateX }] },
          ]}
        />

        {/* Consumed Option */}
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => handleToggle('consumed')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              isConsumed ? styles.activeText : styles.inactiveText,
            ]}
          >
            Consumed
          </Text>
        </TouchableOpacity>

        {/* Remaining Option */}
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => handleToggle('remaining')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              !isConsumed ? styles.activeText : styles.inactiveText,
            ]}
          >
            Remaining
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  pillTrack: {
    flexDirection: 'row',
    backgroundColor: colors.cardHeader, // #242426
    borderRadius: 24,
    padding: 3,
    position: 'relative',
    width: SEGMENT_WIDTH * 2 + 6,
    height: SEGMENT_HEIGHT + 6,
    alignItems: 'center',
  },
  slidingPill: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    borderRadius: 20,
    backgroundColor: colors.textPrimary, // #ffffff
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentBtn: {
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  activeText: {
    color: colors.textDark, // #000000
    fontWeight: '800',
  },
  inactiveText: {
    color: colors.textSecondary, // #808288
    fontWeight: '600',
  },
});
