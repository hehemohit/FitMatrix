import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwipeableScreenPagerProps {
  screens: React.ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export const SwipeableScreenPager: React.FC<SwipeableScreenPagerProps> = ({
  screens,
  currentIndex,
  onIndexChange,
}) => {
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const activeIndexRef = useRef(currentIndex);
  const isUserScrollingRef = useRef(false);

  // Direct instant switch when tab is clicked from bottom panel (no scroll animation)
  useEffect(() => {
    if (activeIndexRef.current !== currentIndex && !isUserScrollingRef.current) {
      activeIndexRef.current = currentIndex;
      scrollViewRef.current?.scrollTo({
        x: currentIndex * SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [currentIndex]);

  const handleScrollBegin = useCallback(() => {
    isUserScrollingRef.current = true;
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrollingRef.current = false;
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.max(
        0,
        Math.min(screens.length - 1, Math.round(offsetX / SCREEN_WIDTH))
      );
      if (newIndex !== activeIndexRef.current) {
        activeIndexRef.current = newIndex;
        onIndexChange(newIndex);
      }
    },
    [screens.length, onIndexChange]
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (e.nativeEvent.velocity?.x === 0) {
        isUserScrollingRef.current = false;
        const offsetX = e.nativeEvent.contentOffset.x;
        const newIndex = Math.max(
          0,
          Math.min(screens.length - 1, Math.round(offsetX / SCREEN_WIDTH))
        );
        if (newIndex !== activeIndexRef.current) {
          activeIndexRef.current = newIndex;
          onIndexChange(newIndex);
        }
      }
    },
    [screens.length, onIndexChange]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.scrollView}
        contentContainerStyle={{ width: SCREEN_WIDTH * screens.length }}
      >
        {screens.map((screen, idx) => (
          <View key={`screen-page-${idx}`} style={styles.screenWrapper}>
            {screen}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  screenWrapper: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
