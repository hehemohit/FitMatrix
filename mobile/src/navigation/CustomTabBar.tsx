import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface CustomTabBarProps {
  currentIndex?: number;
  onSelectIndex?: (index: number) => void;
  onFabPress: () => void;
  state?: any;
  navigation?: any;
}

const TAB_DATA = [
  { name: 'Dashboard', label: 'Dashboard', emoji: '⊞' },
  { name: 'FoodLog', label: 'Food Log', emoji: '🍎' },
  { name: 'Strategy', label: 'Strategy', emoji: '⚛' },
  { name: 'More', label: 'More', emoji: '⋯' },
];

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  currentIndex,
  onSelectIndex,
  onFabPress,
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 24) + 8;

  const activeIndex = typeof currentIndex === 'number' ? currentIndex : (state?.index ?? 0);

  const handleSelect = (idx: number, name: string) => {
    if (onSelectIndex) {
      onSelectIndex(idx);
    } else if (navigation) {
      navigation.navigate(name);
    }
  };

  return (
    <View style={[styles.barContainer, { paddingBottom: bottomPadding }]}>
      {/* Tab 0: Dashboard */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleSelect(0, 'Dashboard')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeIndex === 0 && styles.tabIconActive]}>
          {TAB_DATA[0].emoji}
        </Text>
        <Text style={[styles.tabLabel, activeIndex === 0 && styles.tabLabelActive]}>
          {TAB_DATA[0].label}
        </Text>
        {activeIndex === 0 && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Tab 1: Food Log */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleSelect(1, 'FoodLog')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeIndex === 1 && styles.tabIconActive]}>
          {TAB_DATA[1].emoji}
        </Text>
        <Text style={[styles.tabLabel, activeIndex === 1 && styles.tabLabelActive]}>
          {TAB_DATA[1].label}
        </Text>
        {activeIndex === 1 && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Center Elevated Action Button (+) */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={onFabPress}
          activeOpacity={0.85}
        >
          <Text style={styles.fabPlus}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tab 2: Strategy */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleSelect(2, 'Strategy')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeIndex === 2 && styles.tabIconActive]}>
          {TAB_DATA[2].emoji}
        </Text>
        <Text style={[styles.tabLabel, activeIndex === 2 && styles.tabLabelActive]}>
          {TAB_DATA[2].label}
        </Text>
        {activeIndex === 2 && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Tab 3: More */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleSelect(3, 'More')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeIndex === 3 && styles.tabIconActive]}>
          {TAB_DATA[3].emoji}
        </Text>
        <Text style={[styles.tabLabel, activeIndex === 3 && styles.tabLabelActive]}>
          {TAB_DATA[3].label}
        </Text>
        {activeIndex === 3 && <View style={styles.activeDot} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.appDark, // #121213
    borderTopWidth: 1,
    borderTopColor: '#ffffff1a',
    paddingTop: 10,
    paddingHorizontal: 8,
    position: 'relative',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  tabIconActive: {
    color: colors.textPrimary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentBlue,
    marginTop: 2,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.textPrimary, // #ffffff
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  fabPlus: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark, // #000000
    lineHeight: 28,
  },
});
