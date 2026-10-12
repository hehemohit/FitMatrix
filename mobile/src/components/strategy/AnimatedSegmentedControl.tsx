import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { colors } from '../../theme/colors';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  icon?: string;
  subLabel?: string;
}

interface AnimatedSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  style?: any;
  disabled?: boolean;
}

export function AnimatedSegmentedControl<T extends string>({
  options,
  selectedKey,
  onSelect,
  style,
  disabled = false,
}: AnimatedSegmentedControlProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectedIndex = Math.max(
    0,
    options.findIndex(opt => opt.key === selectedKey)
  );

  const animIndex = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    setIsAnimating(true);
    Animated.spring(animIndex, {
      toValue: selectedIndex,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start(({ finished }) => {
      if (finished) {
        setIsAnimating(false);
      }
    });
  }, [selectedIndex, animIndex]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const numTabs = options.length;
  const padding = 4;
  const availableWidth = containerWidth > 0 ? containerWidth - padding * 2 : 0;
  const tabWidth = numTabs > 0 ? availableWidth / numTabs : 0;

  const translateX = animIndex.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => i * tabWidth),
    extrapolate: 'clamp',
  });

  const hasSubLabels = options.some(opt => !!opt.subLabel);

  const handlePress = (key: T) => {
    if (disabled || isAnimating || key === selectedKey) {
      return;
    }
    setIsAnimating(true);
    onSelect(key);
  };

  return (
    <View
      style={[
        styles.container,
        hasSubLabels && styles.containerWithSubLabels,
        disabled && styles.containerDisabled,
        style,
      ]}
      onLayout={handleLayout}
      pointerEvents={disabled || isAnimating ? 'none' : 'auto'}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingPill,
            hasSubLabels && styles.slidingPillWithSubLabels,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {options.map((opt) => {
        const isSelected = opt.key === selectedKey;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.tabBtn, hasSubLabels && styles.tabBtnWithSubLabels]}
            onPress={() => handlePress(opt.key)}
            disabled={disabled || isAnimating || isSelected}
            activeOpacity={0.7}
          >
            {opt.icon && <Text style={styles.tabIcon}>{opt.icon}</Text>}
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.tabText,
                  isSelected ? styles.tabTextActive : styles.tabTextInactive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {opt.label}
              </Text>
              {opt.subLabel && (
                <Text
                  style={[
                    styles.tabSubText,
                    isSelected ? styles.tabSubTextActive : styles.tabSubTextInactive,
                  ]}
                  numberOfLines={1}
                >
                  {opt.subLabel}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 4,
    position: 'relative',
    height: 44,
    alignItems: 'center',
    marginBottom: 16,
  },
  containerWithSubLabels: {
    height: 52,
  },
  containerDisabled: {
    opacity: 0.65,
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 10,
    backgroundColor: colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  slidingPillWithSubLabels: {
    top: 4,
    bottom: 4,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    gap: 6,
    paddingHorizontal: 4,
  },
  tabBtnWithSubLabels: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 1,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 13,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.textDark,
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },
  tabSubText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  tabSubTextActive: {
    color: colors.textDark + 'cc',
  },
  tabSubTextInactive: {
    color: colors.textSecondary + 'aa',
  },
});
