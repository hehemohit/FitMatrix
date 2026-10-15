import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useWorkoutHistoryStore } from '../../store/useWorkoutHistoryStore';

type TimeRange = '30d' | '90d' | '1Y' | 'All';

export const EffortAnalysisCard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');
  const { workouts } = useWorkoutHistoryStore();

  const daysCutoff = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : timeRange === '1Y' ? 365 : 3650;

  const analysis = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysCutoff);

    const relevantWorkouts = workouts.filter(w => {
      if (!w.completedAt) return true;
      return new Date(w.completedAt) >= cutoffDate;
    });

    let totalRatedSets = 0;
    let totalRirSum = 0;
    let hardSetsCount = 0; // RIR <= 2

    // Histogram bins: RIR 0, 1, 2, 3, 4+
    const bins: Record<string, number> = {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4+': 0,
    };

    relevantWorkouts.forEach(w => {
      w.exercises?.forEach(ex => {
        ex.sets?.forEach(s => {
          if (s.isCompleted) {
            // Determine RIR: if explicitly set use it, else if failure set it's 0, else infer from RPE or default 2
            let rir = s.rir;
            if (rir == null) {
              if (s.type === 'failure') rir = 0;
              else if (s.rpe != null) rir = Math.max(0, 10 - s.rpe);
              else rir = 2; // sensible fallback
            }

            totalRatedSets++;
            totalRirSum += rir;

            if (rir <= 2) {
              hardSetsCount++;
            }

            if (rir <= 0) bins['0']++;
            else if (rir === 1) bins['1']++;
            else if (rir === 2) bins['2']++;
            else if (rir === 3) bins['3']++;
            else bins['4+']++;
          }
        });
      });
    });

    const avgRir = totalRatedSets > 0 ? (totalRirSum / totalRatedSets).toFixed(1) : '2.0';
    const hardPct = totalRatedSets > 0 ? Math.round((hardSetsCount / totalRatedSets) * 100) : 65;

    return {
      totalRatedSets,
      avgRir,
      hardPct,
      bins,
      hasData: totalRatedSets > 0,
    };
  }, [workouts, daysCutoff]);

  const maxBinCount = Math.max(1, ...Object.values(analysis.bins));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Effort</Text>
          <Text style={styles.subtitle}>How close to failure · RIR (reps in reserve)</Text>
        </View>
      </View>

      {/* Range Pills */}
      <View style={styles.pillsRow}>
        {(['30d', '90d', '1Y', 'All'] as const).map(pill => (
          <TouchableOpacity
            key={pill}
            style={[styles.pill, timeRange === pill && styles.pillActive]}
            onPress={() => setTimeRange(pill)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, timeRange === pill && styles.pillTextActive]}>
              {pill}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Numbers Row */}
      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statVal}>{analysis.avgRir} RIR</Text>
          <Text style={styles.statLbl}>average effort</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.statVal, { color: '#eab308' }]}>{analysis.hardPct}%</Text>
          <Text style={styles.statLbl}>at 2 RIR or harder</Text>
        </View>
      </View>

      {/* Histogram */}
      <Text style={styles.histogramTitle}>Where the sets land</Text>
      <View style={styles.histogramContainer}>
        {Object.entries(analysis.bins).map(([binKey, count]) => {
          const pct = analysis.totalRatedSets > 0 ? Math.round((count / analysis.totalRatedSets) * 100) : 0;
          const fillWidth = Math.max(4, Math.round((count / maxBinCount) * 100));
          const isHard = binKey === '0' || binKey === '1' || binKey === '2';

          return (
            <View key={binKey} style={styles.histRow}>
              <Text style={styles.histLabel}>RIR {binKey}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${fillWidth}%`,
                      backgroundColor: isHard ? '#eab308' : '#4b5563',
                    },
                  ]}
                />
              </View>
              <Text style={styles.histVal}>
                {count > 0 ? `${count} · ${pct}%` : '–'}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.tipText}>
        💡 Most working sets belong close to failure (1–3 RIR), not directly at it.
      </Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    backgroundColor: '#0e1017',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222736',
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLbl: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  histogramTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  histogramContainer: {
    gap: 8,
    marginBottom: 14,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  histLabel: {
    width: 50,
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#10131a',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  histVal: {
    width: 60,
    textAlign: 'right',
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tipText: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
