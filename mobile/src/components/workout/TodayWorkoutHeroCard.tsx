import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle } from 'react-native-svg';

interface TodayWorkoutHeroCardProps {
  routineName?: string;
  statusText?: string;
  onStartPress: () => void;
  onCardPress?: () => void;
}

export const TodayWorkoutHeroCard: React.FC<TodayWorkoutHeroCardProps> = ({
  routineName = 'Push Day · Scheduled',
  statusText = 'TODAY',
  onStartPress,
  onCardPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onCardPress || onStartPress}
      activeOpacity={0.85}
    >
      <View style={styles.leftRow}>
        {/* Green Icon Box */}
        <View style={styles.iconBox}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Rect x="2" y="9" width="3" height="6" rx="1" fill="#000000" />
            <Rect x="5" y="7" width="2" height="10" rx="1" fill="#000000" />
            <Line x1="7" y1="12" x2="17" y2="12" stroke="#000000" strokeWidth="2.5" />
            <Rect x="17" y="7" width="2" height="10" rx="1" fill="#000000" />
            <Rect x="19" y="9" width="3" height="6" rx="1" fill="#000000" />
          </Svg>
        </View>

        {/* Text Info */}
        <View style={styles.textWrap}>
          <Text style={styles.statusLabel}>{statusText.toUpperCase()}</Text>
          <Text style={styles.routineTitle} numberOfLines={1}>
            {routineName}
          </Text>
        </View>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={styles.startBtn}
        onPress={onStartPress}
        activeOpacity={0.8}
      >
        <Text style={styles.startBtnText}>Start</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161922',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#242838',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  startBtn: {
    backgroundColor: '#1b382b',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  startBtnText: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default TodayWorkoutHeroCard;
