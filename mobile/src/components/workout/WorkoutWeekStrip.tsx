import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CompletedWorkoutRecord } from '../../store/useWorkoutHistoryStore';

interface WorkoutWeekStripProps {
  completedWorkouts: CompletedWorkoutRecord[];
  plannedDays?: number[]; // [1, 2, 4, 5]
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
}

const DAYS_HEADER = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export const WorkoutWeekStrip: React.FC<WorkoutWeekStripProps> = ({
  completedWorkouts,
  plannedDays = [1, 3, 5],
  selectedDate,
  onSelectDate,
}) => {
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon

  const weekData = useMemo(() => {
    // Offset to start on Monday
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    return DAYS_HEADER.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const iso = d.toISOString().split('T')[0];
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      const hasCompleted = completedWorkouts.some(w => {
        const wIso = new Date(w.completedAt).toISOString().split('T')[0];
        return wIso === iso;
      });

      return {
        label,
        dayNum: d.getDate(),
        iso,
        isToday,
        hasCompleted,
      };
    });
  }, [completedWorkouts, currentDayOfWeek]);

  return (
    <View style={styles.card}>
      {/* Header with < This week > */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekTitle}>This week</Text>
        <TouchableOpacity style={styles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 7 Days Row */}
      <View style={styles.daysRow}>
        {weekData.map((day, idx) => {
          const isSelected = selectedDate === day.iso;
          return (
            <TouchableOpacity
              key={idx}
              style={styles.dayCol}
              onPress={() => onSelectDate && onSelectDate(day.iso)}
              activeOpacity={0.7}
            >
              <Text style={styles.dayLabel}>{day.label}</Text>
              <View
                style={[
                  styles.dayNumWrap,
                  day.isToday && styles.todayNumWrap,
                  isSelected && !day.isToday && styles.selectedNumWrap,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumText,
                    day.isToday && styles.todayNumText,
                  ]}
                >
                  {day.dayNum}
                </Text>
              </View>

              {/* Indicator Dot */}
              <View style={styles.dotContainer}>
                {day.isToday ? (
                  <View style={styles.todayOrangeDot} />
                ) : day.hasCompleted ? (
                  <View style={styles.completedGreenDot} />
                ) : (
                  <View style={styles.placeholderDot} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161922',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  arrowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  arrowText: {
    fontSize: 20,
    color: '#9ca3af',
    fontWeight: '400',
  },
  weekTitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  dayNumWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayNumWrap: {
    backgroundColor: '#22c55e',
  },
  selectedNumWrap: {
    borderWidth: 1.5,
    borderColor: '#22c55e',
  },
  dayNumText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
  todayNumText: {
    color: '#000000',
    fontWeight: '800',
  },
  dotContainer: {
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  completedGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22c55e',
  },
  todayOrangeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f59e0b',
  },
  placeholderDot: {
    width: 5,
    height: 5,
  },
});

export default WorkoutWeekStrip;
