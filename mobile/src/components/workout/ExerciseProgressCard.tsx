import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useWorkoutHistoryStore, calculate1RM } from '../../store/useWorkoutHistoryStore';
import { useExerciseLibraryStore } from '../../store/useExerciseLibraryStore';

type MetricMode = 'top' | '1rm' | 'max_reps' | 'effort';
type RangeMode = '1M' | '3M' | '1Y' | 'All';

// Catmull-Rom spline helper
function getSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const ExerciseProgressCard: React.FC = () => {
  const { workouts } = useWorkoutHistoryStore();
  const { exercises: libraryExercises } = useExerciseLibraryStore();

  const [metric, setMetric] = useState<MetricMode>('top');
  const [range, setRange] = useState<RangeMode>('3M');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');

  // Collect all unique exercise names from workout history
  const recordedExerciseNames = useMemo(() => {
    const set = new Set<string>();
    workouts.forEach(w => {
      w.exercises?.forEach(e => {
        if (e.name) set.add(e.name);
      });
    });
    return Array.from(set);
  }, [workouts]);

  // Default exercise
  const [selectedExName, setSelectedExName] = useState<string>(() => {
    if (recordedExerciseNames.length > 0) return recordedExerciseNames[0];
    return 'Barbell Bench Press';
  });

  const daysCutoff = range === '1M' ? 30 : range === '3M' ? 90 : range === '1Y' ? 365 : 3650;

  // Extract sessions for the selected exercise
  const exerciseSessions = useMemo(() => {
    const list: {
      date: string;
      topWeight: number;
      est1RM: number;
      maxReps: number;
      avgRir: number;
      setsSummary: string;
    }[] = [];

    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - daysCutoff);

    workouts.forEach(w => {
      const match = w.exercises?.find(
        e => e.name.toLowerCase() === selectedExName.toLowerCase()
      );
      if (!match) return;

      const completed = match.sets?.filter(s => s.isCompleted) || [];
      if (completed.length === 0) return;

      const wDate = w.completedAt ? new Date(w.completedAt) : new Date();
      if (wDate < cutoff) return;

      let topW = 0;
      let best1rm = 0;
      let maxR = 0;
      let totalRir = 0;

      completed.forEach(s => {
        if (s.weight > topW) topW = s.weight;
        const e1rm = calculate1RM(s.weight, s.reps);
        if (e1rm > best1rm) best1rm = e1rm;
        if (s.reps > maxR) maxR = s.reps;
        totalRir += s.rir ?? 2;
      });

      const setsStr = completed.map(s => `${s.weight}×${s.reps}`).join(', ');

      list.push({
        date: wDate.toISOString().split('T')[0],
        topWeight: topW,
        est1RM: best1rm,
        maxReps: maxR,
        avgRir: Math.round(totalRir / completed.length),
        setsSummary: setsStr,
      });
    });

    // Sort chronologically ascending for the chart
    list.sort((a, b) => a.date.localeCompare(b.date));

    // Fallback data if user has no sessions yet so the chart renders gracefully
    if (list.length === 0) {
      return [
        { date: '2026-08-01', topWeight: 135, est1RM: 160, maxReps: 8, avgRir: 2, setsSummary: '135×8, 135×8' },
        { date: '2026-08-15', topWeight: 140, est1RM: 168, maxReps: 8, avgRir: 2, setsSummary: '140×8, 140×7' },
        { date: '2026-09-01', topWeight: 145, est1RM: 172, maxReps: 8, avgRir: 1, setsSummary: '145×8, 145×6' },
        { date: '2026-09-15', topWeight: 150, est1RM: 178, maxReps: 8, avgRir: 2, setsSummary: '150×8, 150×8' },
        { date: '2026-10-01', topWeight: 155, est1RM: 185, maxReps: 8, avgRir: 1, setsSummary: '155×8, 155×7' },
      ];
    }

    return list;
  }, [workouts, selectedExName, daysCutoff]);

  const bestValue = useMemo(() => {
    if (exerciseSessions.length === 0) return 0;
    if (metric === '1rm') return Math.max(...exerciseSessions.map(s => s.est1RM));
    if (metric === 'max_reps') return Math.max(...exerciseSessions.map(s => s.maxReps));
    if (metric === 'effort') return Math.min(...exerciseSessions.map(s => s.avgRir));
    return Math.max(...exerciseSessions.map(s => s.topWeight));
  }, [exerciseSessions, metric]);

  const chartWidth = Dimensions.get('window').width - 64;
  const chartHeight = 130;

  const { chartPath, areaPath, pointsList } = useMemo(() => {
    if (exerciseSessions.length === 0) {
      return { chartPath: '', areaPath: '', pointsList: [] };
    }

    const values = exerciseSessions.map(s => {
      if (metric === '1rm') return s.est1RM;
      if (metric === 'max_reps') return s.maxReps;
      if (metric === 'effort') return s.avgRir;
      return s.topWeight;
    });

    const minVal = Math.min(...values) * 0.95;
    const maxVal = Math.max(...values) * 1.05;
    const rangeVal = Math.max(1, maxVal - minVal);

    const padX = 14;
    const usableW = chartWidth - padX * 2;
    const padTop = 16;
    const usableH = chartHeight - padTop - 20;

    const points = values.map((val, idx) => {
      const x = padX + (idx / Math.max(1, values.length - 1)) * usableW;
      const normalizedY = (val - minVal) / rangeVal;
      const y = chartHeight - 16 - normalizedY * usableH;
      return { x, y, val, date: exerciseSessions[idx].date };
    });

    const cPath = getSmoothPath(points);
    const lastP = points[points.length - 1];
    const firstP = points[0];
    const aPath = `${cPath} L ${lastP.x.toFixed(1)} ${chartHeight} L ${firstP.x.toFixed(1)} ${chartHeight} Z`;

    return { chartPath: cPath, areaPath: aPath, pointsList: points };
  }, [exerciseSessions, metric, chartWidth]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Exercise progress</Text>

      {/* Exercise Picker Trigger */}
      <TouchableOpacity
        style={styles.pickerTrigger}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.pickerLabel} numberOfLines={1}>
          {selectedExName}
        </Text>
        <Text style={styles.pickerChevron}>▾</Text>
      </TouchableOpacity>

      {/* Metric Switcher Pills */}
      <View style={styles.pillsRow}>
        {(['top', '1rm', 'max_reps', 'effort'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.pill, metric === m && styles.pillActive]}
            onPress={() => setMetric(m)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, metric === m && styles.pillTextActive]}>
              {m === 'top'
                ? 'Top set'
                : m === '1rm'
                ? 'Est. 1RM'
                : m === 'max_reps'
                ? 'Max reps'
                : 'Effort'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Range Pills */}
      <View style={[styles.pillsRow, { marginBottom: 12 }]}>
        {(['1M', '3M', '1Y', 'All'] as const).map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.pill, range === r && styles.pillActive]}
            onPress={() => setRange(r)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, range === r && styles.pillTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Line Chart */}
      <View style={styles.chartWrap}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {areaPath ? <Path d={areaPath} fill="url(#exGrad)" /> : null}
          {chartPath ? <Path d={chartPath} stroke="#3b82f6" strokeWidth={2.5} fill="none" /> : null}

          {pointsList.map((p, idx) => (
            <Circle
              key={`dot-${idx}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#3b82f6"
              stroke="#161922"
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      </View>

      {/* Best PR Callout */}
      <View style={styles.bestRow}>
        <Text style={styles.bestLabel}>
          Best:{' '}
          <Text style={styles.bestVal}>
            {bestValue}{' '}
            {metric === 'max_reps' ? 'reps' : metric === 'effort' ? 'RIR' : 'lb'}
          </Text>
        </Text>
      </View>

      {/* Recent Sessions List */}
      <View style={styles.sessionsList}>
        {exerciseSessions.slice(-4).reverse().map((s, idx) => (
          <View key={`s-${idx}`} style={styles.sessionRow}>
            <Text style={styles.sessionDate}>{s.date}</Text>
            <Text style={styles.sessionSets} numberOfLines={1}>
              {s.setsSummary}
            </Text>
          </View>
        ))}
      </View>

      {/* Exercise Picker Modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.modalSearch}
            placeholder="Search exercises..."
            placeholderTextColor="#6b7280"
            value={search}
            onChangeText={setSearch}
          />

          <FlatList
            data={
              search
                ? libraryExercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
                : recordedExerciseNames.length > 0
                ? recordedExerciseNames.map(name => ({ id: name, name }))
                : libraryExercises
            }
            keyExtractor={item => item.id || item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseOption}
                onPress={() => {
                  setSelectedExName(item.name);
                  setPickerVisible(false);
                }}
              >
                <Text style={styles.exerciseOptionName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0e1017',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242838',
    marginBottom: 12,
  },
  pickerLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  pickerChevron: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    backgroundColor: '#0e1017',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: '#242838',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  chartWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  bestRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bestLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bestVal: {
    fontWeight: '700',
    color: '#3b82f6',
  },
  sessionsList: {
    borderTopWidth: 1,
    borderTopColor: '#202434',
    paddingTop: 8,
    gap: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 11,
    color: '#6b7280',
    width: 80,
  },
  sessionSets: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0c10',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalCloseText: {
    fontSize: 15,
    color: '#22c55e',
    fontWeight: '700',
  },
  modalSearch: {
    backgroundColor: '#161922',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#242838',
    marginBottom: 12,
  },
  exerciseOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1c202d',
  },
  exerciseOptionName: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
});
