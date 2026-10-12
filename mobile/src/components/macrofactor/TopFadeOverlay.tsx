import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

interface TopFadeOverlayProps {
  /** Height of the fade zone below the status bar (default: 32) */
  fadeHeight?: number;
  /** Base background color to fade from (default: colors.appDark #121213) */
  baseColor?: string;
}

/**
 * TopFadeOverlay
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a silky-smooth translucent gradient fade at the top of the screen.
 * Covers the Android/iOS status bar with pure dark background, then gently
 * fades down into the scrollable content below.
 *
 * Replaces hard-coded gaps with a luxurious, ambient fade effect (similar
 * to Spotify / MacroFactor header transitions).
 */
export const TopFadeOverlay: React.FC<TopFadeOverlayProps> = ({
  fadeHeight = 32,
  baseColor = colors.appDark,
}) => {
  const insets = useSafeAreaInsets();
  const androidBarHeight = StatusBar.currentHeight || 24;

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      (StatusBar as any).setTranslucent?.(true);
      (StatusBar as any).setBackgroundColor?.('transparent', true);
    }
  }, []);

  const statusBarHeight = Platform.OS === 'android'
    ? Math.max(insets.top, androidBarHeight)
    : insets.top;

  // Generate 16 micro-slices for a smooth cubic-eased gradient fade
  const slices = useMemo(() => {
    const STEPS = 16;
    const sliceHeight = fadeHeight / STEPS;
    const items = [];

    for (let i = 0; i < STEPS; i++) {
      // Ease-out cubic curve from 1.0 down to 0.0
      const progress = i / STEPS;
      const opacity = Math.max(0, Math.min(1, Math.pow(1 - progress, 1.8)));

      items.push({
        key: `slice-${i}`,
        height: sliceHeight,
        opacity,
      });
    }

    return items;
  }, [fadeHeight]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Solid background covering the status bar */}
      <View style={{ height: statusBarHeight, backgroundColor: baseColor }} />

      {/* Contiguous gradient fade slices */}
      {slices.map(slice => (
        <View
          key={slice.key}
          style={{
            height: slice.height,
            backgroundColor: baseColor,
            opacity: slice.opacity,
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
});
