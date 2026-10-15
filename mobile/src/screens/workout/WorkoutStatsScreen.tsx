import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useWorkoutHistoryStore, CompletedWorkoutRecord, calculate1RM } from '../../store/useWorkoutHistoryStore';
import { useTrainerStore } from '../../store/useTrainerStore';
import { useDashboardTabStore } from '../../store/useDashboardTabStore';
import { AnatomicalSilhouette, MuscleHeatMap } from '../../components/workout/AnatomicalSilhouette';
import { BodyWeightTrendCard } from '../../components/workout/BodyWeightTrendCard';
import { WeeklyPlanVolumeCard } from '../../components/workout/WeeklyPlanVolumeCard';
import { EffortAnalysisCard } from '../../components/workout/EffortAnalysisCard';
import { ExerciseProgressCard } from '../../components/workout/ExerciseProgressCard';
import { WorkoutHistoryModal } from '../../components/workout/WorkoutHistoryModal';
import { WorkoutDetailModal } from '../../components/workout/WorkoutDetailModal';
import { WeighInLogModal } from '../../components/workout/WeighInLogModal';
import { WeightGoalModal } from '../../components/workout/WeightGoalModal';
import { AllWeighInsModal } from '../../components/workout/AllWeighInsModal';

interface WorkoutStatsScreenProps {
  onOpenHistory?: () => void;
}

const HEATMAP_WEEKS = 52; // 52 columns (last 12 months)
const HEATMAP_DAYS = 7; // 7 rows (Mon-Sun)

const MUSCLE_DISPLAY_NAMES: Record<string, string> = {
  chest: 'Chest',
  deltoids: 'Shoulders',
  'upper-back': 'Upper Back',
  trapezius: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  gluteal: 'Glutes',
  calves: 'Calves',
  adductors: 'Adductors',
};

const ALL_MAJOR_MUSCLES = [
  'chest',
  'deltoids',
  'upper-back',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstring',
  'gluteal',
  'calves',
  'abs',
  'trapezius',
  'forearm',
];

function toCanonicalMuscle(raw: string | undefined): string {
  if (!raw) return 'chest';
  const s = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (s.includes('pect') || s.includes('chest')) return 'chest';
  if (s.includes('delt') || s.includes('shoulder')) return 'deltoids';
  if (s.includes('bicep')) return 'biceps';
  if (s.includes('tricep')) return 'triceps';
  if (s.includes('lat') || s.includes('upperback') || s.includes('back')) return 'upper-back';
  if (s.includes('trap')) return 'trapezius';
  if (s.includes('forearm') || s.includes('lowerarm')) return 'forearm';
  if (s.includes('abs') || s.includes('waist') || s.includes('core') || s.includes('abdominal')) return 'abs';
  if (s.includes('oblique')) return 'obliques';
  if (s.includes('quad') || s.includes('upperleg')) return 'quadriceps';
  if (s.includes('hamstring')) return 'hamstring';
  if (s.includes('glute')) return 'gluteal';
  if (s.includes('calv') || s.includes('lowerleg')) return 'calves';
  if (s.includes('adduct')) return 'adductors';
  return 'chest';
}


export const WorkoutStatsScreen: React.FC<WorkoutStatsScreenProps> = ({
  onOpenHistory,
}) => {
  const topInset = useSafeTopInset(10);
  const { workouts, getStreakWeeks, deleteWorkout } = useWorkoutHistoryStore();
  const { weighInRecords, userProfile, strategyProfile } = useTrainerStore();
  const { setActiveDashboard } = useDashboardTabStore();

  // Modals state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [detailModalWorkout, setDetailModalWorkout] = useState<CompletedWorkoutRecord | null>(null);
  const [weighInModalVisible, setWeighInModalVisible] = useState(false);
  const [weightGoalModalVisible, setWeightGoalModalVisible] = useState(false);
  const [allWeighInsModalVisible, setAllWeighInsModalVisible] = useState(false);

  // Muscular Silhouette state
  const [activeSegment, setActiveSegment] = useState<'balance' | 'fatigue' | 'strength'>('balance');
  const [timeFilter, setTimeFilter] = useState<'Week' | '30d' | '90d' | 'All'>('Week');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [onlyHardSets, setOnlyHardSets] = useState<boolean>(false);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [musclesExpanded, setMusclesExpanded] = useState<boolean>(false);

  // Dynamic metrics: top 4 tiles
  const totalWorkouts = workouts.length;
  const streak = getStreakWeeks();

  const workoutsThisMonth = useMemo(() => {
    const now = new Date();
    return workouts.filter(w => {
      if (!w.completedAt) return false;
      const d = new Date(w.completedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [workouts]);

  const weight30dDelta = useMemo(() => {
    if (weighInRecords && weighInRecords.length >= 2) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyStr = thirtyDaysAgo.toISOString().split('T')[0];
      const recent = weighInRecords.filter(r => r.date >= thirtyStr);
      if (recent.length >= 2) {
        const delta = recent[recent.length - 1].weightKg - recent[0].weightKg;
        return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${userProfile?.unit || 'kg'}`;
      }
    }
    return '–';
  }, [weighInRecords, userProfile]);

  // Handle open history
  const handleOpenHistory = () => {
    if (onOpenHistory) {
      onOpenHistory();
    } else {
      setHistoryModalVisible(true);
    }
  };

  // Heatmap state
  const heatmapScrollRef = useRef<any>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<'time' | 'vol'>('time');
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{
    date: string;
    count: number;
    totalMin: number;
    totalVol: number;
    workouts: CompletedWorkoutRecord[];
  } | null>(null);

  // Auto-scroll heatmap to the end (today) on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      heatmapScrollRef.current?.scrollToEnd({ animated: false });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Activity Heatmap: rolling 52 weeks (last 12 months) with quartile shading & local dates
  const { heatmapColumns } = useMemo(() => {
    // 1. Multi-workout aggregation by local date
    const agg: Record<string, {
      count: number;
      totalMin: number;
      totalVol: number;
      workouts: CompletedWorkoutRecord[];
    }> = {};

    workouts.forEach(w => {
      if (!w.completedAt) return;
      const d = new Date(w.completedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!agg[key]) {
        agg[key] = { count: 0, totalMin: 0, totalVol: 0, workouts: [] };
      }
      agg[key].count += 1;
      agg[key].totalMin += Math.max(0, Math.round((w.durationSeconds || 0) / 60));
      agg[key].totalVol += Math.max(0, w.totalVolumeLb || 0);
      agg[key].workouts.push(w);
    });

    // 2. Active values for percentile-based shading
    const activeValues = Object.values(agg)
      .map(a => (heatmapMetric === 'vol' ? a.totalVol : a.totalMin))
      .filter(v => v > 0)
      .sort((a, b) => a - b);

    const getLevel = (entry?: { totalMin: number; totalVol: number }) => {
      if (!entry) return 0;
      const val = heatmapMetric === 'vol' ? entry.totalVol : entry.totalMin;
      if (val <= 0) return 0;
      if (activeValues.length === 0) return 1;

      const q = (p: number) => activeValues[Math.min(activeValues.length - 1, Math.floor(p * activeValues.length))];
      const t1 = q(0.25);
      const t2 = q(0.5);
      const t3 = q(0.75);

      if (val >= t3) return 4;
      if (val >= t2) return 3;
      if (val >= t1) return 2;
      return 1;
    };

    // 3. 52-week calendar grid: Monday of 51 weeks ago -> this week
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const currentWeekMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
    const startMon = new Date(currentWeekMon.getFullYear(), currentWeekMon.getMonth(), currentWeekMon.getDate() - 51 * 7);

    const cols: {
      colIdx: number;
      monthLabel?: string;
      days: {
        date: string;
        isToday: boolean;
        isFuture: boolean;
        level: number;
        entry?: { count: number; totalMin: number; totalVol: number; workouts: CompletedWorkoutRecord[] };
      }[];
    }[] = [];

    let lastMonth = -1;

    for (let wk = 0; wk < HEATMAP_WEEKS; wk++) {
      const colMon = new Date(startMon.getFullYear(), startMon.getMonth(), startMon.getDate() + wk * 7);
      const m = colMon.getMonth();
      let monthLabel: string | undefined = undefined;
      // Show month label when month changes and within first week of month
      if (m !== lastMonth && colMon.getDate() <= 7 && wk < HEATMAP_WEEKS - 1) {
        lastMonth = m;
        monthLabel = colMon.toLocaleDateString('en-US', { month: 'short' });
      }

      const days = [];
      for (let r = 0; r < HEATMAP_DAYS; r++) {
        const cellDate = new Date(colMon.getFullYear(), colMon.getMonth(), colMon.getDate() + r);
        const cellKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        const entry = agg[cellKey];
        const isToday = cellKey === todayKey;
        const isFuture = cellDate.getTime() > now.getTime() && !isToday;
        const level = isFuture ? 0 : getLevel(entry);

        days.push({
          date: cellKey,
          isToday,
          isFuture,
          level,
          entry,
        });
      }

      cols.push({
        colIdx: wk,
        monthLabel,
        days,
      });
    }

    return { heatmapColumns: cols, aggByDate: agg };
  }, [workouts, heatmapMetric]);

  // Selected week start date for Week pagination
  const weekRangeLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    const day = d.getDay();
    const monDiff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + monDiff);
    return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [weekOffset]);

  // Muscle sets breakdown & Heatmap
  const { currentHeatMap, muscleRankings, unworkedMuscles } = useMemo(() => {
    let filtered = workouts;

    if (timeFilter === 'Week') {
      const now = new Date();
      now.setDate(now.getDate() + weekOffset * 7);
      const day = now.getDay();
      const monDiff = (day === 0 ? -6 : 1) - day;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() + monDiff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      filtered = workouts.filter(w => {
        if (!w.completedAt) return false;
        const d = new Date(w.completedAt);
        return d >= startOfWeek && d < endOfWeek;
      });
    } else {
      const days = timeFilter === '30d' ? 30 : timeFilter === '90d' ? 90 : 3650;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = workouts.filter(w => {
        if (!w.completedAt) return true;
        return new Date(w.completedAt) >= cutoff;
      });
    }

    // Scan all workouts for latest training timestamp (for Fatigue & Strength)
    const latestTrained: Record<string, number> = {};
    workouts.forEach(w => {
      const wTimestamp = w.completedAt ? new Date(w.completedAt).getTime() : Date.now();
      w.exercises?.forEach(ex => {
        const canonical = toCanonicalMuscle(ex.target || ex.category);
        const hasCompleted = ex.sets?.some(s => s.isCompleted);
        if (hasCompleted && (!latestTrained[canonical] || wTimestamp > latestTrained[canonical])) {
          latestTrained[canonical] = wTimestamp;
        }
      });
    });

    // Scan filtered workouts for sets breakdown (for Muscle balance)
    const setsPerMuscle: Record<string, number> = {};
    filtered.forEach(w => {
      w.exercises?.forEach(ex => {
        const canonical = toCanonicalMuscle(ex.target || ex.category);
        ex.sets?.forEach(s => {
          if (!s.isCompleted) return;
          if (onlyHardSets) {
            const isHard = s.rir != null ? s.rir <= 2 : s.type === 'failure' || (s.rpe != null && s.rpe >= 8);
            if (!isHard) return;
          }
          setsPerMuscle[canonical] = (setsPerMuscle[canonical] || 0) + 1;
        });
      });
    });

    const maxSets = Math.max(1, ...Object.values(setsPerMuscle));
    const heatMap: MuscleHeatMap = {};

    if (activeSegment === 'fatigue') {
      // Fatigue mode: days since training
      const nowMs = Date.now();
      ALL_MAJOR_MUSCLES.forEach(m => {
        const last = latestTrained[m];
        if (!last) {
          heatMap[m] = 1; // fresh / ready
        } else {
          const daysAgo = Math.floor((nowMs - last) / (1000 * 60 * 60 * 24));
          if (daysAgo <= 1) heatMap[m] = 9; // Fatigued (red)
          else if (daysAgo <= 3) heatMap[m] = 5; // Recovering (amber)
          else heatMap[m] = 1; // Ready (green)
        }
      });
    } else if (activeSegment === 'strength') {
      // Strength mode: retained strength
      const nowMs = Date.now();
      ALL_MAJOR_MUSCLES.forEach(m => {
        const last = latestTrained[m];
        if (!last) {
          heatMap[m] = 4;
        } else {
          const weeksAgo = Math.floor((nowMs - last) / (1000 * 60 * 60 * 24 * 7));
          if (weeksAgo <= 1) heatMap[m] = 9;
          else if (weeksAgo <= 2) heatMap[m] = 7;
          else if (weeksAgo <= 4) heatMap[m] = 5;
          else heatMap[m] = 3;
        }
      });
    } else {
      // Balance mode
      Object.entries(setsPerMuscle).forEach(([m, count]) => {
        heatMap[m] = Math.min(10, Math.max(2, Math.round((count / maxSets) * 10)));
      });
    }

    const rankings = Object.entries(setsPerMuscle)
      .sort((a, b) => b[1] - a[1])
      .map(([m, sets]) => ({
        key: m,
        name: MUSCLE_DISPLAY_NAMES[m] || m,
        sets,
        pct: Math.round((sets / maxSets) * 100),
      }));

    const workedSet = new Set(Object.keys(setsPerMuscle));
    const unworked = ALL_MAJOR_MUSCLES.filter(m => !workedSet.has(m)).map(
      m => MUSCLE_DISPLAY_NAMES[m] || m
    );

    return { currentHeatMap: heatMap, muscleRankings: rankings, unworkedMuscles: unworked };
  }, [workouts, activeSegment, timeFilter, weekOffset, onlyHardSets]);

  // Selected muscle exercise history (for Strength view)
  const selectedMuscleExercises = useMemo(() => {
    if (!selectedMuscle) return [];
    const exMap = new Map<string, { name: string; est1RM: number; lastDate: string }>();

    workouts.forEach(w => {
      w.exercises?.forEach(ex => {
        const canonical = toCanonicalMuscle(ex.target || ex.category);
        if (canonical === selectedMuscle) {
          let best1RM = 0;
          ex.sets?.forEach(s => {
            if (s.isCompleted) {
              const e = calculate1RM(s.weight, s.reps);
              if (e > best1RM) best1RM = e;
            }
          });
          if (best1RM > 0) {
            const existing = exMap.get(ex.name);
            if (!existing || best1RM > existing.est1RM) {
              exMap.set(ex.name, {
                name: ex.name,
                est1RM: best1RM,
                lastDate: w.completedAt ? w.completedAt.split('T')[0] : 'Recent',
              });
            }
          }
        }
      });
    });

    return Array.from(exMap.values()).slice(0, 4);
  }, [selectedMuscle, workouts]);

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
            onPress={handleOpenHistory}
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
        {/* Top 4 Metric Tiles Grid */}
        <View style={styles.metricGrid}>
          {/* Workouts */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={handleOpenHistory}
            activeOpacity={0.8}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>🏋️</Text>
              <Text style={styles.metricLabel}>Workouts</Text>
            </View>
            <Text style={styles.metricValue}>{totalWorkouts}</Text>
          </TouchableOpacity>

          {/* This Month */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>📅</Text>
              <Text style={styles.metricLabel}>This month</Text>
            </View>
            <Text style={styles.metricValue}>{workoutsThisMonth}</Text>
          </View>

          {/* Streak */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>🔥</Text>
              <Text style={styles.metricLabel}>Week streak</Text>
            </View>
            <Text style={styles.metricValue}>{streak}</Text>
          </View>

          {/* Weight 30d */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => setAllWeighInsModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricIcon}>⚖️</Text>
              <Text style={styles.metricLabel}>Weight 30d</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#22c55e' }]}>{weight30dDelta}</Text>
          </TouchableOpacity>
        </View>

        {/* 12 Months Activity Heatmap Card */}
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapHeaderRow}>
            <View>
              <Text style={styles.heatmapTitle}>Activity</Text>
              <Text style={styles.heatmapSubtitle}>Last 12 months · 52 weeks</Text>
            </View>
            {/* Metric Switcher Segmented Control */}
            <View style={styles.heatmapSegmentedControl}>
              <TouchableOpacity
                style={[
                  styles.heatmapSegmentBtn,
                  heatmapMetric === 'time' && styles.heatmapSegmentBtnActive,
                ]}
                onPress={() => setHeatmapMetric('time')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.heatmapSegmentText,
                    heatmapMetric === 'time' && styles.heatmapSegmentTextActive,
                  ]}
                >
                  ⏱ Time
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.heatmapSegmentBtn,
                  heatmapMetric === 'vol' && styles.heatmapSegmentBtnActive,
                ]}
                onPress={() => setHeatmapMetric('vol')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.heatmapSegmentText,
                    heatmapMetric === 'vol' && styles.heatmapSegmentTextActive,
                  ]}
                >
                  🏋️ Volume
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Grid Layout: Fixed Day Labels on left + Horizontal Scrollable 52-week Columns */}
          <View style={styles.heatmapBodyRow}>
            {/* Sticky Day Labels on Left: Mon, Wed, Fri */}
            <View style={styles.heatmapStickyDaysCol}>
              <View style={styles.heatmapMonthSpacer} />
              <View style={styles.dayLabelItem}><Text style={styles.dayLabelText}>Mon</Text></View>
              <View style={styles.dayLabelItemEmpty} />
              <View style={styles.dayLabelItem}><Text style={styles.dayLabelText}>Wed</Text></View>
              <View style={styles.dayLabelItemEmpty} />
              <View style={styles.dayLabelItem}><Text style={styles.dayLabelText}>Fri</Text></View>
              <View style={styles.dayLabelItemEmpty} />
              <View style={styles.dayLabelItemEmpty} />
            </View>

            {/* Scrollable Heatmap Weeks */}
            <ScrollView
              ref={heatmapScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heatmapScrollContent}
              onContentSizeChange={() => {
                heatmapScrollRef.current?.scrollToEnd({ animated: false });
              }}
            >
              <View>
                {/* Month Labels Row */}
                <View style={styles.monthHeaderRow}>
                  {heatmapColumns.map((col, idx) => (
                    <View key={`m-${idx}`} style={styles.monthColCell}>
                      {col.monthLabel ? (
                        <Text style={styles.monthColLabel}>{col.monthLabel}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* 52 Columns */}
                <View style={styles.gridColumnsRow}>
                  {heatmapColumns.map((col, cIdx) => (
                    <View key={`col-${cIdx}`} style={styles.gridCol}>
                      {col.days.map((cell, rIdx) => {
                        const isSelected = selectedHeatmapDay?.date === cell.date;
                        const bg =
                          cell.level === 4
                            ? '#4ade80'
                            : cell.level === 3
                            ? '#22c55e'
                            : cell.level === 2
                            ? '#16a34a'
                            : cell.level === 1
                            ? '#15803d'
                            : '#1a1e29';

                        return (
                          <TouchableOpacity
                            key={`c-${cIdx}-${rIdx}`}
                            style={[
                              styles.heatSquare,
                              { backgroundColor: bg },
                              cell.isToday && styles.heatSquareToday,
                              isSelected && styles.heatSquareSelected,
                              cell.isFuture && { opacity: 0.25 },
                            ]}
                            activeOpacity={cell.isFuture ? 1 : 0.7}
                            disabled={cell.isFuture}
                            onPress={() => {
                              setSelectedHeatmapDay({
                                date: cell.date,
                                count: cell.entry?.count || 0,
                                totalMin: cell.entry?.totalMin || 0,
                                totalVol: cell.entry?.totalVol || 0,
                                workouts: cell.entry?.workouts || [],
                              });
                            }}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Scale Legend */}
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>
              {heatmapMetric === 'vol' ? 'Less volume' : 'Less time'}
            </Text>
            <View style={[styles.legendSquare, { backgroundColor: '#1a1e29' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#15803d' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#16a34a' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#22c55e' }]} />
            <View style={[styles.legendSquare, { backgroundColor: '#4ade80' }]} />
            <Text style={styles.legendText}>
              {heatmapMetric === 'vol' ? 'More volume' : 'More time'}
            </Text>
          </View>

          {/* Day Inspection Details Box */}
          {selectedHeatmapDay && (
            <View style={styles.dayInspectBox}>
              <View style={styles.dayInspectHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayInspectDate}>
                    {new Date(selectedHeatmapDay.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.dayInspectStats}>
                    {selectedHeatmapDay.count > 0
                      ? `${selectedHeatmapDay.count} workout${selectedHeatmapDay.count > 1 ? 's' : ''} · ${selectedHeatmapDay.totalMin} min · ${selectedHeatmapDay.totalVol.toLocaleString()} ${userProfile?.unit || 'lb'}`
                      : 'Rest day · No workouts logged'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dayInspectCloseBtn}
                  onPress={() => setSelectedHeatmapDay(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dayInspectCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Workouts logged on that day */}
              {selectedHeatmapDay.workouts.map((w, idx) => (
                <TouchableOpacity
                  key={w.id || `dw-${idx}`}
                  style={styles.dayWorkoutCard}
                  activeOpacity={0.7}
                  onPress={() => setDetailModalWorkout(w)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayWorkoutTitle}>{w.routineName || 'Workout'}</Text>
                    <Text style={styles.dayWorkoutSub}>
                      {Math.round((w.durationSeconds || 0) / 60)} min · {(w.totalVolumeLb || 0).toLocaleString()} {userProfile?.unit || 'lb'} · {w.exercises?.length || 0} exercises
                    </Text>
                  </View>
                  <Text style={styles.dayWorkoutChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Muscular Balance / Fatigue / Strength Silhouette Card */}
        <View style={styles.silhouetteCard}>
          {/* 3-Way Segment Tabs */}
          <View style={styles.segmentBar}>
            {(['balance', 'fatigue', 'strength'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.segmentItem, activeSegment === tab && styles.segmentItemActive]}
                onPress={() => {
                  setActiveSegment(tab);
                  setSelectedMuscle(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, activeSegment === tab && styles.segmentTextActive]}>
                  {tab === 'balance' ? 'Muscle balance' : tab === 'fatigue' ? 'Fatigue' : 'Strength'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subheader & All/Hard Filter */}
          <View style={styles.balanceHeaderRow}>
            <Text style={styles.balanceSubtext}>
              {activeSegment === 'balance'
                ? `Muscle balance · ${onlyHardSets ? 'by hard sets (≤2 RIR)' : 'by sets worked'}`
                : activeSegment === 'fatigue'
                ? 'Recovery state · based on workout recency'
                : 'Retained strength · train again to reset'}
            </Text>
            {activeSegment === 'balance' && (
              <TouchableOpacity
                style={[styles.hardToggleBtn, onlyHardSets && styles.hardToggleBtnActive]}
                onPress={() => setOnlyHardSets(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.hardToggleText, onlyHardSets && styles.hardToggleTextActive]}>
                  {onlyHardSets ? '🔥 Hard sets' : 'All sets'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Time Filter Pills: [ Week ] [ 30d ] [ 90d ] [ All ] (balance view only) */}
          {activeSegment === 'balance' && (
            <View style={styles.timePillsRow}>
              {(['Week', '30d', '90d', 'All'] as const).map(pill => (
                <TouchableOpacity
                  key={pill}
                  style={[styles.timePill, timeFilter === pill && styles.timePillActive]}
                  onPress={() => {
                    setTimeFilter(pill);
                    setWeekOffset(0);
                    setSelectedMuscle(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timePillText, timeFilter === pill && styles.timePillTextActive]}>
                    {pill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Week Pagination when "Week" is chosen */}
          {activeSegment === 'balance' && timeFilter === 'Week' && (
            <View style={styles.weekPaginationRow}>
              <TouchableOpacity
                style={styles.weekArrowBtn}
                onPress={() => setWeekOffset(o => o - 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.weekArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.weekRangeText}>{weekRangeLabel}</Text>
              <TouchableOpacity
                style={[styles.weekArrowBtn, weekOffset >= 0 && { opacity: 0.3 }]}
                onPress={() => setWeekOffset(o => Math.min(0, o + 1))}
                disabled={weekOffset >= 0}
                activeOpacity={0.7}
              >
                <Text style={styles.weekArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* High-Fidelity Silhouette (Front + Back) */}
          <View style={styles.silhouetteWrap}>
            <AnatomicalSilhouette
              gender="male"
              heatMap={currentHeatMap}
              selectedMuscle={selectedMuscle}
              onSelectMuscle={m => setSelectedMuscle(m === selectedMuscle ? null : m)}
              height={290}
              mode={activeSegment}
            />
          </View>

          {/* Active Mode Specific Breakdown */}
          {activeSegment === 'balance' ? (
            <View style={styles.balanceListWrap}>
              {selectedMuscle ? (
                <View style={styles.singleMuscleCard}>
                  <Text style={styles.singleMuscleTitle}>
                    {MUSCLE_DISPLAY_NAMES[selectedMuscle] || selectedMuscle}
                  </Text>
                  <Text style={styles.singleMuscleSets}>
                    {currentHeatMap[selectedMuscle] ?? 0} sets recorded
                  </Text>
                </View>
              ) : (
                <>
                  {(musclesExpanded ? muscleRankings : muscleRankings.slice(0, 4)).map(m => (
                    <View key={m.key} style={styles.muscleRow}>
                      <Text style={styles.muscleRowName}>{m.name}</Text>
                      <View style={styles.muscleBarTrack}>
                        <View style={[styles.muscleBarFill, { width: `${m.pct}%` }]} />
                      </View>
                      <Text style={styles.muscleRowSets}>{m.sets} sets</Text>
                    </View>
                  ))}

                  {muscleRankings.length > 4 && (
                    <TouchableOpacity
                      style={styles.expandToggleBtn}
                      onPress={() => setMusclesExpanded(v => !v)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.expandToggleText}>
                        {musclesExpanded ? 'Show less ⌃' : 'Show more ⌄'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {unworkedMuscles.length > 0 && (
                    <View style={styles.unworkedSection}>
                      <Text style={styles.unworkedTitle}>Not trained in this period:</Text>
                      <View style={styles.unworkedChipsRow}>
                        {unworkedMuscles.slice(0, 5).map((name, idx) => (
                          <View key={`u-${idx}`} style={styles.unworkedChip}>
                            <Text style={styles.unworkedChipText}>{name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : activeSegment === 'fatigue' ? (
            <View style={styles.fatigueWrap}>
              {/* Legend */}
              <View style={styles.fatigueLegendRow}>
                <View style={styles.fatigueLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.fatigueLegendText}>Fatigued</Text>
                </View>
                <View style={styles.fatigueLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.fatigueLegendText}>Recovering</Text>
                </View>
                <View style={styles.fatigueLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.fatigueLegendText}>Ready</Text>
                </View>
              </View>

              <Text style={styles.fatigueSubtext}>
                Fatigue reflects training recency. Red muscles need 24–48 hours of recovery before intense loading.
              </Text>

              {selectedMuscle && (
                <View style={styles.muscleInspectBox}>
                  <Text style={styles.inspectMuscleTitle}>
                    {MUSCLE_DISPLAY_NAMES[selectedMuscle] || selectedMuscle}
                  </Text>
                  <Text style={styles.inspectMuscleStatus}>
                    Status:{' '}
                    {(currentHeatMap[selectedMuscle] ?? 0) >= 8
                      ? 'Fatigued (Rest recommended)'
                      : (currentHeatMap[selectedMuscle] ?? 0) >= 4
                      ? 'Recovering'
                      : 'Ready for training'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.strengthWrap}>
              {/* Legend */}
              <View style={styles.fatigueLegendRow}>
                <View style={styles.fatigueLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#06b6d4' }]} />
                  <Text style={styles.fatigueLegendText}>1.0 Full</Text>
                </View>
                <View style={styles.fatigueLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
                  <Text style={styles.fatigueLegendText}>0.6 Floor</Text>
                </View>
              </View>

              <Text style={styles.fatigueSubtext}>
                Strength shows retained muscular adaptation. Regular stimuli maintain top neuromuscular output.
              </Text>

              {selectedMuscle ? (
                <View style={styles.muscleInspectBox}>
                  <Text style={styles.inspectMuscleTitle}>
                    {MUSCLE_DISPLAY_NAMES[selectedMuscle] || selectedMuscle} · Exercises
                  </Text>
                  {selectedMuscleExercises.length > 0 ? (
                    selectedMuscleExercises.map((e, idx) => (
                      <View key={`ex-${idx}`} style={styles.strengthExRow}>
                        <Text style={styles.strengthExName}>{e.name}</Text>
                        <Text style={styles.strengthEx1RM}>Est. 1RM: {e.est1RM} lb</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noExText}>No estimated 1RM logged for this muscle yet.</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.tapPromptText}>Tap any muscle group on the silhouette to inspect exercises.</Text>
              )}
            </View>
          )}
        </View>

        {/* Weekly Muscle Volume Plan Card */}
        <WeeklyPlanVolumeCard />

        {/* Quick Jump Action Cards */}
        <View style={styles.actionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Structural balance</Text>
            <Text style={styles.actionCardSub}>See which lift is holding back the rest.</Text>
          </View>
          <TouchableOpacity
            style={styles.actionCardBtn}
            onPress={() => Alert.alert('Structural Balance', 'Bench, Squat, and Overhead press ratios are well balanced.')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionCardBtnText}>Open ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Progress photos</Text>
            <Text style={styles.actionCardSub}>Every photo you kept with a workout, lined up by date.</Text>
          </View>
          <TouchableOpacity
            style={styles.actionCardBtn}
            onPress={() => Alert.alert('Progress Photos', 'Take a progress check-in photo in the Home tab.')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionCardBtnText}>Open ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Body measurements</Text>
            <Text style={styles.actionCardSub}>Waist, arms, body fat and anything else you measure.</Text>
          </View>
          <TouchableOpacity
            style={styles.actionCardBtn}
            onPress={() => setAllWeighInsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionCardBtnText}>Open ›</Text>
          </TouchableOpacity>
        </View>

        {/* Effort Analysis Card */}
        <EffortAnalysisCard />

        {/* Body Weight Trend Card */}
        <BodyWeightTrendCard
          currentWeight={userProfile?.weight_kg || 78.4}
          goalWeight={strategyProfile?.target_weight_kg || 75.0}
          weighInRecords={weighInRecords}
          onLogPress={() => setWeighInModalVisible(true)}
          onGoalPress={() => setWeightGoalModalVisible(true)}
          onAllWeighInsPress={() => setAllWeighInsModalVisible(true)}
        />

        {/* Exercise Progress Card */}
        <ExerciseProgressCard />

        {/* Recent Workouts List */}
        {workouts.length > 0 && (
          <View style={styles.recentWorkoutsCard}>
            <View style={styles.recentHeaderRow}>
              <Text style={styles.recentTitle}>Recent workouts</Text>
              <TouchableOpacity
                onPress={handleOpenHistory}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.allHistoryBtnText}>All {workouts.length} ›</Text>
              </TouchableOpacity>
            </View>

            {workouts.slice(0, 5).map(w => {
              const d = w.completedAt ? new Date(w.completedAt) : new Date();
              const dateStr = d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const durationMin = Math.round((w.durationSeconds || 0) / 60);

              return (
                <TouchableOpacity
                  key={w.id}
                  style={styles.recentWorkoutRow}
                  activeOpacity={0.7}
                  onPress={() => setDetailModalWorkout(w)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentRoutineName}>{w.routineName}</Text>
                    <Text style={styles.recentRoutineMeta}>
                      {dateStr} · {durationMin}m · {w.exercises?.length || 0} exercises
                    </Text>
                  </View>
                  <View style={styles.recentVolumeBadge}>
                    <Text style={styles.recentVolumeText}>
                      {(w.totalVolumeLb || 0).toLocaleString()} lb
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <WorkoutHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
      />

      <WorkoutDetailModal
        visible={!!detailModalWorkout}
        workout={detailModalWorkout}
        onClose={() => setDetailModalWorkout(null)}
        onDelete={id => deleteWorkout(id)}
      />

      <WeighInLogModal
        visible={weighInModalVisible}
        onClose={() => setWeighInModalVisible(false)}
      />

      <WeightGoalModal
        visible={weightGoalModalVisible}
        onClose={() => setWeightGoalModalVisible(false)}
      />

      <AllWeighInsModal
        visible={allWeighInsModalVisible}
        onClose={() => setAllWeighInsModalVisible(false)}
        onLogPress={() => setWeighInModalVisible(true)}
      />
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
    paddingBottom: 120,
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
    fontSize: 26,
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
  heatmapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heatmapTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700',
  },
  heatmapSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  heatmapSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0e1017',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#242838',
  },
  heatmapSegmentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heatmapSegmentBtnActive: {
    backgroundColor: '#242838',
  },
  heatmapSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  heatmapSegmentTextActive: {
    color: '#22c55e',
    fontWeight: '700',
  },
  heatmapBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heatmapStickyDaysCol: {
    width: 26,
    paddingRight: 4,
  },
  heatmapMonthSpacer: {
    height: 18,
  },
  dayLabelItem: {
    height: 15,
    justifyContent: 'center',
  },
  dayLabelItemEmpty: {
    height: 15,
  },
  dayLabelText: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '500',
  },
  heatmapScrollContent: {
    paddingRight: 10,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    height: 18,
  },
  monthColCell: {
    width: 15,
    overflow: 'visible',
  },
  monthColLabel: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '600',
    width: 35,
  },
  gridColumnsRow: {
    flexDirection: 'row',
  },
  gridCol: {
    width: 15,
    alignItems: 'center',
  },
  heatSquare: {
    width: 12,
    height: 12,
    borderRadius: 2.5,
    marginVertical: 1.5,
    backgroundColor: '#1a1e29',
  },
  heatSquareToday: {
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  heatSquareSelected: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 6,
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
  dayInspectBox: {
    backgroundColor: '#10131a',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#242838',
  },
  dayInspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayInspectDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  dayInspectStats: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  dayInspectCloseBtn: {
    padding: 4,
  },
  dayInspectCloseText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '700',
  },
  dayWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161a24',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#252a3b',
  },
  dayWorkoutTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  dayWorkoutSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  dayWorkoutChevron: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
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
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  hardToggleBtn: {
    backgroundColor: '#242838',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hardToggleBtnActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderColor: '#eab308',
  },
  hardToggleText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  hardToggleTextActive: {
    color: '#eab308',
    fontWeight: '700',
  },
  timePillsRow: {
    flexDirection: 'row',
    backgroundColor: '#0e1017',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  timePill: {
    flex: 1,
    paddingVertical: 5,
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
  weekPaginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#12151c',
    borderRadius: 10,
    marginBottom: 10,
  },
  weekArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1c202d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekArrowText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '800',
  },
  weekRangeText: {
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '700',
  },
  silhouetteWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  balanceListWrap: {
    marginTop: 12,
    gap: 8,
  },
  singleMuscleCard: {
    backgroundColor: '#12151c',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  singleMuscleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  singleMuscleSets: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 2,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muscleRowName: {
    width: 80,
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  muscleBarTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#0e1017',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  muscleBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  muscleRowSets: {
    width: 50,
    textAlign: 'right',
    fontSize: 11,
    color: '#9ca3af',
  },
  expandToggleBtn: {
    alignItems: 'center',
    paddingTop: 8,
  },
  expandToggleText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
  },
  unworkedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#202434',
  },
  unworkedTitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
  },
  unworkedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unworkedChip: {
    backgroundColor: '#1a1e28',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unworkedChipText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  fatigueWrap: {
    marginTop: 10,
  },
  fatigueLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  fatigueLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fatigueLegendText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  fatigueSubtext: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  strengthWrap: {
    marginTop: 10,
  },
  muscleInspectBox: {
    backgroundColor: '#12151c',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  inspectMuscleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  inspectMuscleStatus: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  strengthExRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1c202d',
  },
  strengthExName: {
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  strengthEx1RM: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
  },
  noExText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  tapPromptText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },
  actionCard: {
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#242838',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionCardSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  actionCardBtn: {
    backgroundColor: '#242838',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionCardBtnText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
  },
  recentWorkoutsCard: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  allHistoryBtnText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '700',
  },
  recentWorkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#202434',
  },
  recentRoutineName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  recentRoutineMeta: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  recentVolumeBadge: {
    backgroundColor: '#1c202d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#282e42',
  },
  recentVolumeText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '700',
  },
});

export default WorkoutStatsScreen;
