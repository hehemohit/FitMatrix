import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';

export type WorkoutTabKey = 'home' | 'plan' | 'start' | 'stats' | 'exercises';

interface WorkoutTabBarProps {
  activeTab: WorkoutTabKey;
  onSelectTab: (tab: WorkoutTabKey) => void;
  isWorkoutActive?: boolean;
}

export const WorkoutTabBar: React.FC<WorkoutTabBarProps> = ({
  activeTab,
  onSelectTab,
  isWorkoutActive = false,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 20) + 4;

  const ACTIVE_COLOR = '#22c55e'; // Bright Neon Green
  const INACTIVE_COLOR = '#8e95a5';

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* Tab 1: Home */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('home')}
        activeOpacity={0.7}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z"
            stroke={activeTab === 'home' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'home' ? ACTIVE_COLOR : INACTIVE_COLOR },
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Plan */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('plan')}
        activeOpacity={0.7}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke={activeTab === 'plan' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
          />
          <Line
            x1="3"
            y1="9"
            x2="21"
            y2="9"
            stroke={activeTab === 'plan' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
          />
          <Line
            x1="8"
            y1="2"
            x2="8"
            y2="5"
            stroke={activeTab === 'plan' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Line
            x1="16"
            y1="2"
            x2="16"
            y2="5"
            stroke={activeTab === 'plan' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'plan' ? ACTIVE_COLOR : INACTIVE_COLOR },
          ]}
        >
          Plan
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Center Elevated Button (Start / Workout) */}
      <View style={styles.centerButtonWrapper}>
        <TouchableOpacity
          style={[
            styles.centerButton,
            isWorkoutActive ? styles.centerButtonActiveWorkout : styles.centerButtonDefault,
          ]}
          onPress={() => onSelectTab('start')}
          activeOpacity={0.85}
        >
          {/* Dumbbell Icon |o-o| */}
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Rect x="2" y="9" width="3" height="6" rx="1" fill="#000000" />
            <Rect x="5" y="7" width="2" height="10" rx="1" fill="#000000" />
            <Line x1="7" y1="12" x2="17" y2="12" stroke="#000000" strokeWidth="2.5" />
            <Rect x="17" y="7" width="2" height="10" rx="1" fill="#000000" />
            <Rect x="19" y="9" width="3" height="6" rx="1" fill="#000000" />
          </Svg>
        </TouchableOpacity>
        <Text
          style={[
            styles.centerLabel,
            { color: isWorkoutActive ? '#f59e0b' : ACTIVE_COLOR },
          ]}
        >
          {isWorkoutActive ? 'Workout' : 'Start'}
        </Text>
      </View>

      {/* Tab 4: Stats */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('stats')}
        activeOpacity={0.7}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Line
            x1="6"
            y1="20"
            x2="6"
            y2="14"
            stroke={activeTab === 'stats' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <Line
            x1="12"
            y1="20"
            x2="12"
            y2="8"
            stroke={activeTab === 'stats' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <Line
            x1="18"
            y1="20"
            x2="18"
            y2="4"
            stroke={activeTab === 'stats' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </Svg>
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'stats' ? ACTIVE_COLOR : INACTIVE_COLOR },
          ]}
        >
          Stats
        </Text>
      </TouchableOpacity>

      {/* Tab 5: Exercises */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('exercises')}
        activeOpacity={0.7}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Line
            x1="8"
            y1="6"
            x2="21"
            y2="6"
            stroke={activeTab === 'exercises' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Line
            x1="8"
            y1="12"
            x2="21"
            y2="12"
            stroke={activeTab === 'exercises' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Line
            x1="8"
            y1="18"
            x2="21"
            y2="18"
            stroke={activeTab === 'exercises' ? ACTIVE_COLOR : INACTIVE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Circle
            cx="3.5"
            cy="6"
            r="1.5"
            fill={activeTab === 'exercises' ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
          <Circle
            cx="3.5"
            cy="12"
            r="1.5"
            fill={activeTab === 'exercises' ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
          <Circle
            cx="3.5"
            cy="18"
            r="1.5"
            fill={activeTab === 'exercises' ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
        </Svg>
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'exercises' ? ACTIVE_COLOR : INACTIVE_COLOR },
          ]}
        >
          Exercises
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0e14',
    borderTopWidth: 1,
    borderTopColor: '#1c1f2a',
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    elevation: 10,
  },
  centerButtonDefault: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowRadius: 12,
  },
  centerButtonActiveWorkout: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowRadius: 14,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});

export default WorkoutTabBar;
