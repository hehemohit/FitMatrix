import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';

interface HabitsSectionProps {
  weighInHistory?: boolean[];
  weighInStat?: string; // e.g. "6/7"
  foodLogHistory?: boolean[];
  foodLogStat?: string; // e.g. "7/7"
  onWeighInPress?: () => void;
  onFoodLogPress?: () => void;
}

interface AnimatedHabitCardProps {
  title: string;
  subtitle: string;
  data: boolean[];
  stat: string;
  activeColor: string;
  onPress?: () => void;
}

const AnimatedHabitCard: React.FC<AnimatedHabitCardProps> = ({
  title,
  subtitle,
  data,
  stat,
  activeColor,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for today's active/pending dot (the 28th dot)
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  // Safe 28-day slice
  const dots = data.length >= 28 ? data.slice(-28) : [...Array(28 - data.length).fill(false), ...data];

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.habitCard,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>

          {/* 4 rows x 7 columns consistency grid */}
          <View style={styles.grid}>
            {dots.map((active, idx) => {
              const isToday = idx === 27; // Last day represents today
              if (isToday) {
                return (
                  <View key={`today_dot_${idx}`} style={styles.todayDotWrapper}>
                    <Animated.View
                      style={[
                        styles.todayPulseRing,
                        {
                          borderColor: active ? activeColor : colors.subtleGray,
                          transform: [{ scale: pulseAnim }],
                          opacity: active ? 0.8 : 0.4,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.dot,
                        styles.todayDot,
                        {
                          backgroundColor: active ? activeColor : '#2e3034',
                          borderWidth: active ? 0 : 1,
                          borderColor: colors.subtleGray,
                        },
                      ]}
                    />
                  </View>
                );
              }

              return (
                <View
                  key={`dot_${idx}`}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: active ? activeColor : colors.dimBlock,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.statText}>
            <Text style={[styles.statBold, { color: activeColor }]}>{stat}</Text>{' '}
            <Text style={styles.statLabel}>this week</Text>
          </Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export const HabitsSection: React.FC<HabitsSectionProps> = ({
  weighInHistory,
  weighInStat = '0/7',
  foodLogHistory,
  foodLogStat = '0/7',
  onWeighInPress,
  onFoodLogPress,
}) => {
  // If no history passed, default to realistic baseline
  const weighData = weighInHistory && weighInHistory.length > 0
    ? weighInHistory
    : [
        false, false, true, true, true, true, true,
        true, false, true, false, true, true, true,
        false, false, true, false, true, true, true,
        false, true, false, true, false, true, true,
      ];

  const foodData = foodLogHistory && foodLogHistory.length > 0
    ? foodLogHistory
    : [
        true, true, true, true, true, true, true,
        true, true, true, true, true, true, true,
        true, true, true, true, true, true, true,
        true, true, true, true, true, true, true,
      ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Habits</Text>

      <View style={styles.cardsRow}>
        {/* Card 1: Weigh-In */}
        <AnimatedHabitCard
          title="Weigh-In"
          subtitle="Last 30 Days"
          data={weighData}
          stat={weighInStat}
          activeColor={colors.accentGreen}
          onPress={onWeighInPress}
        />

        {/* Card 2: Food Logging */}
        <AnimatedHabitCard
          title="Food Logging"
          subtitle="Last 30 Days"
          data={foodData}
          stat={foodLogStat}
          activeColor={colors.accentBlue}
          onPress={onFoodLogPress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  habitCard: {
    flex: 1,
    backgroundColor: colors.cardBg, // #1c1c1e
    borderRadius: 18,
    padding: 14,
    minHeight: 148,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ffffff0d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
  },
  todayDotWrapper: {
    width: 10,
    height: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPulseRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  todayDot: {
    zIndex: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  statText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  statBold: {
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  chevron: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
