import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CompletedWorkoutRecord } from '../../../store/useWorkoutHistoryStore';

interface InteractiveWeekStripProps {
  completedWorkouts: CompletedWorkoutRecord[];
  plannedDays?: number[]; // [1, 3, 5] (Mon, Wed, Fri)
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate?: (dateStr: string) => void;
}

const DAYS_OF_WEEK = [
  { label: 'Mon', index: 1 },
  { label: 'Tue', index: 2 },
  { label: 'Wed', index: 3 },
  { label: 'Thu', index: 4 },
  { label: 'Fri', index: 5 },
  { label: 'Sat', index: 6 },
  { label: 'Sun', index: 0 },
];

export const InteractiveWeekStrip: React.FC<InteractiveWeekStripProps> = ({
  completedWorkouts,
  plannedDays = [1, 2, 4, 5], // Default PPL split or AI split
  selectedDate,
  onSelectDate,
}) => {
  const today = new Date();
  const currentDayOfWeek = today.getDay();

  // Calculate current week dates (Mon to Sun)
  const weekDays = useMemo(() => {
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    return DAYS_OF_WEEK.map((d, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      const isoDate = date.toISOString().split('T')[0];
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      // Check if any workout was completed on this date
      const isCompleted = completedWorkouts.some(w => {
        const wDate = new Date(w.completedAt).toISOString().split('T')[0];
        return wDate === isoDate;
      });

      const isPlanned = plannedDays.includes(d.index);

      return {
        label: d.label,
        dayNum: date.getDate(),
        isoDate,
        isToday,
        isCompleted,
        isPlanned,
      };
    });
  }, [completedWorkouts, plannedDays, currentDayOfWeek]);

  return (
    <View style={styles.container}>
      {weekDays.map(item => {
        const isSelected = selectedDate === item.isoDate;

        return (
          <TouchableOpacity
            key={item.isoDate}
            style={[
              styles.dayCol,
              item.isToday && styles.dayColToday,
              isSelected && styles.dayColSelected,
            ]}
            onPress={() => onSelectDate?.(item.isoDate)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday]}>
              {item.label}
            </Text>
            <Text style={[styles.dayNumber, item.isToday && styles.dayNumberToday]}>
              {item.dayNum}
            </Text>

            {/* Status Indicator Dot */}
            <View
              style={[
                styles.dot,
                item.isCompleted
                  ? styles.dotCompleted
                  : item.isPlanned
                  ? styles.dotPlanned
                  : styles.dotRest,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161922',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#222836',
    marginBottom: 16,
  },
  dayCol: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 40,
  },
  dayColToday: {
    backgroundColor: '#1c2436',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  dayColSelected: {
    backgroundColor: '#242e45',
  },
  dayLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayLabelToday: {
    color: '#60a5fa',
    fontWeight: '900',
  },
  dayNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  dayNumberToday: {
    color: '#93c5fd',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotCompleted: {
    backgroundColor: '#10b981', // Green done dot
  },
  dotPlanned: {
    backgroundColor: '#3b82f6', // Blue plan dot
  },
  dotRest: {
    backgroundColor: '#334155', // Gray rest dot
  },
});
