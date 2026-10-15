import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Line, Circle } from 'react-native-svg';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useWorkoutHistoryStore } from '../../store/useWorkoutHistoryStore';
import { useDashboardTabStore } from '../../store/useDashboardTabStore';
import { AnatomicalSilhouette, MuscleHeatMap } from '../../components/workout/AnatomicalSilhouette';

interface WorkoutStatsScreenProps {
  onOpenHistory?: () => void;
}

const HEATMAP_WEEKS = 24; // 24 columns
const HEATMAP_DAYS = 7; // 7 rows (Mon-Sun)

export const WorkoutStatsScreen: React.FC<WorkoutStatsScreenProps> = ({
  onOpenHistory,
}) => {
  const topInset = useSafeTopInset(10);
  const { workouts, getStreakWeeks } = useWorkoutHistoryStore();
  const { setActiveDashboard } = useDashboardTabStore();

  const [activeSegment, setActiveSegment] = useState<'balance' | 'fatigue' | 'strength'>('balance');
  const [timeFilter, setTimeFilter] = useState<'Week' | '30d' | '90d' | 'All'>('Week');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // Dynamic metrics
  const totalWorkouts = workouts.length > 0 ? workouts.length : 35;
  const streak = getStreakWeeks() > 0 ? getStreakWeeks() : 12;

  // Mock heatmap matrix matching screenshot
  const heatmapData = React.useMemo(() => {
    const grid: number[][] = [];
    for (let r = 0; r < HEATMAP_DAYS; r++) {
      const row: number[] = [];
      for (let c = 0; c < HEATMAP_WEEKS; c++) {
        // High density in last 8 columns (matching screenshot)
        if (c > 14 && (r === 0 || r === 2 || r === 4)) {
          row.push(1);
        } else if (c > 17 && r === 1) {
          row.push(1);
        } else {
          row.push(0);
        }
      }
      grid.push(row);
    }
    return grid;
  }, []);

  // Muscle Heatmap based on workouts or reference distribution
  const currentHeatMap: MuscleHeatMap = React.useMemo(() => {
    if (activeSegment === 'fatigue') {
      const fatigueMap: MuscleHeatMap = {
        chest: 6,
        deltoids: 8,
        triceps: 9,
        abs: 2,
        quadriceps: 3,
        calves: 1,
      };
      return fatigueMap;
    }
    if (activeSegment === 'strength') {
      const strengthMap: MuscleHeatMap = {
        chest: 10,
        deltoids: 8,
        biceps: 6,
        triceps: 7,
        quadriceps: 9,
        hamstring: 6,
      };
      return strengthMap;
    }
    // Default: Muscle balance (Screenshot 4: chest, abs, deltoids, obliques, biceps, upper-back highlighted)
    const balanceMap: MuscleHeatMap = {
      chest: 8,
      deltoids: 8,
      abs: 7,
      obliques: 6,
      biceps: 7,
      triceps: 5,
      'upper-back': 8,
      trapezius: 5,
      forearm: 6,
      quadriceps: 0,
      calves: 0,
    };
    return balanceMap;
  }, [activeSegment]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>Stats</Text>
          <Text style={styles.subtitle}>Progress & history</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Nutrition Switcher Button */}
          <TouchableOpacity
            style={styles.switcherBtn}
            onPress={() => setActiveDashboard('nutrition')}
            activeOpacity={0.8}
          >
            <Text style={styles.switcherText}>🍎 Nutrition</Text>
          </TouchableOpacity>

          {/* History Clock Button */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={onOpenHistory}
            activeOpacity={0.7}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="9" stroke="#9ca3af" strokeWidth="2" />
              <Line x1="12" y1="7" x2="12" y2="12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
              <Line x1="12" y1="12" x2="16" y2="14" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2x2 Metric Cards Grid */}
        <View style={styles.metricGrid}>
          {/* Card 1: Workouts */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>🏋️</Text>
              <Text style={styles.metricLabel}>Workouts</Text>
            </View>
            <Text style={styles.metricValue}>{totalWorkouts}</Text>
          </View>

          {/* Card 2: This month */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>📅</Text>
              <Text style={styles.metricLabel}>This month</Text>
            </View>
            <Text style={styles.metricValue}>5</Text>
          </View>

          {/* Card 3: Week streak */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>🔥</Text>
              <Text style={styles.metricLabel}>Week streak</Text>
            </View>
            <Text style={styles.metricValue}>{streak}</Text>
          </View>

          {/* Card 4: Weight 30d */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>⚖️</Text>
              <Text style={styles.metricLabel}>Weight 30d</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#22c55e' }]}>-1 kg</Text>
          </View>
        </View>

        {/* Activity 12 Months Heatmap Card */}
        <View style={styles.heatmapCard}>
          <Text style={styles.heatmapTitle}>
            Activity — last 12 months · <Text style={styles.heatmapSub}>by time trained</Text>
          </Text>

          {/* Month labels */}
          <View style={styles.monthLabelsRow}>
            <Text style={styles.monthLabel}>Apr</Text>
            <Text style={styles.monthLabel}>May</Text>
            <Text style={styles.monthLabel}>Jun</Text>
            <Text style={styles.monthLabel}>Jul</Text>
            <Text style={styles.monthLabel}>Aug</Text>
          </View>

          {/* Grid of Squares */}
          <View style={styles.gridContainer}>
            {heatmapData.map((row, rIdx) => (
              <View key={`r-${rIdx}`} style={styles.heatmapRow}>
                {row.map((val, cIdx) => (
                  <View
                    key={`c-${cIdx}`}
                    style={[
                      styles.heatSquare,
                      val === 1 && styles.heatSquareActive,
                      rIdx === 5 && cIdx === 23 && styles.heatSquareCurrent,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Scale Legend */}
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>Less time</Text>
            <View style={[styles.legendSquare, { backgroundColor: '#1c1f2a' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#15803d' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#16a34a' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#22c55e' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#4ade80' }]} />
            <Text style={styles.legendText}>More time</Text>
          </View>
        </View>

        {/* Muscular Balance / Fatigue / Strength Silhouette Card */}
        <View style={styles.silhouetteCard}>
          {/* 3-Way Segmented Tabs */}
          <View style={styles.segmentBar}>
            <TouchableOpacity
              style={[
                styles.segmentItem,
                activeSegment === 'balance' && styles.segmentItemActive,
              ]}
              onPress={() => setActiveSegment('balance')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'balance' && styles.segmentTextActive,
                ]}
              >
                Muscle balance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentItem,
                activeSegment === 'fatigue' && styles.segmentItemActive,
              ]}
              onPress={() => setActiveSegment('fatigue')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'fatigue' && styles.segmentTextActive,
                ]}
              >
                Fatigue
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentItem,
                activeSegment === 'strength' && styles.segmentItemActive,
              ]}
              onPress={() => setActiveSegment('strength')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'strength' && styles.segmentTextActive,
                ]}
              >
                Strength
              </Text>
            </TouchableOpacity>
          </View>

          {/* Descriptor & All Flame */}
          <View style={styles.balanceHeaderRow}>
            <Text style={styles.balanceSubtext}>
              Muscle balance · by sets worked
            </Text>
            <Text style={styles.flameAll}>🔥 All</Text>
          </View>

          {/* Time Filter Pills: [ Week ] [ 30d ] [ 90d ] [ All ] */}
          <View style={styles.timePillsRow}>
            {(['Week', '30d', '90d', 'All'] as const).map(pill => (
              <TouchableOpacity
                key={pill}
                style={[
                  styles.timePill,
                  timeFilter === pill && styles.timePillActive,
                ]}
                onPress={() => setTimeFilter(pill)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timePillText,
                    timeFilter === pill && styles.timePillTextActive,
                  ]}
                >
                  {pill}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* High-Fidelity Muscular Silhouette (Male front/back) */}
          <View style={styles.silhouetteWrap}>
            <AnatomicalSilhouette
              gender="male"
              heatMap={currentHeatMap}
              selectedMuscle={selectedMuscle}
              onSelectMuscle={m => setSelectedMuscle(m === selectedMuscle ? null : m)}
              height={320}
              mode={activeSegment}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0a0c10',
  },
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switcherBtn: {
    backgroundColor: '#1c1f2a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3344',
  },
  switcherText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  historyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161922',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242838',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  metricCard: {
    width: (Dimensions.get('window').width - 42) / 2,
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242838',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 14,
  },
  metricLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  heatmapCard: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  heatmapTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
  },
  heatmapSub: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  monthLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  monthLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  gridContainer: {
    gap: 3,
    marginBottom: 12,
  },
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heatSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#1a1e29',
  },
  heatSquareActive: {
    backgroundColor: '#22c55e',
  },
  heatSquareCurrent: {
    borderWidth: 1.5,
    borderColor: '#22c55e',
    backgroundColor: 'transparent',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
    marginHorizontal: 3,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  silhouetteCard: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#0e1017',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: '#242838',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceSubtext: {
    fontSize: 13,
    color: '#9ca3af',
  },
  flameAll: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '700',
  },
  timePillsRow: {
    flexDirection: 'row',
    backgroundColor: '#0e1017',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  timePill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  timePillActive: {
    backgroundColor: '#242838',
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  timePillTextActive: {
    color: '#ffffff',
  },
  silhouetteWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});

export default WorkoutStatsScreen;
