import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns a guaranteed safe top padding that accounts for:
 * - iOS notches & Dynamic Island
 * - Android system status bar / notification bar height
 * - Hole-punch camera cutouts
 *
 * Prevents UI content from colliding with the status bar.
 */
export const useSafeTopInset = (extraPadding: number = 8): number => {
  const insets = useSafeAreaInsets();
  const androidBarHeight = StatusBar.currentHeight || 24;

  const baseTop = Platform.OS === 'android'
    ? Math.max(insets.top, androidBarHeight)
    : insets.top;

  return baseTop + extraPadding;
};
