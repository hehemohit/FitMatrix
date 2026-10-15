import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
} from 'react-native-svg';

interface BodyWeightTrendCardProps {
  currentWeight?: number;
  goalWeight?: number;
  weightDelta?: number;
  lastWeighInDate?: string;
  onLogPress?: () => void;
}

export const BodyWeightTrendCard: React.FC<BodyWeightTrendCardProps> = ({
  currentWeight = 78.4,
  goalWeight = 77.0,
  weightDelta = -0.5,
  lastWeighInDate = 'Thu 10 Sept',
  onLogPress,
}) => {
  const cardWidth = Dimensions.get('window').width - 32;
  const chartWidth = cardWidth - 32;
  const chartHeight = 120;

  const toLose = Math.max(0, currentWeight - goalWeight).toFixed(1);

  // SVG Mock Curve Points matching screenshot
  // Points spanning Jul to Sep, dropping from 82.5 down towards 77.0
  const pathD = `
    M 10 20
    Q 30 15, 50 35
    T 90 35
    T 130 50
    T 170 52
    T 210 70
    T 240 60
    T 270 75
    T 300 70
    T 330 90
    T 350 90
    T 370 95
  `;

  const fillD = `${pathD} L 370 ${chartHeight} L 10 ${chartHeight} Z`;

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Body weight</Text>
        <View style={styles.rightActions}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetIcon}>🎯</Text>
            <Text style={styles.targetText}>{goalWeight}</Text>
          </View>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={onLogPress}
            activeOpacity={0.7}
          >
            <Text style={styles.logBtnText}>+ Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weight Hero */}
      <View style={styles.weightRow}>
        <View style={styles.weightNumWrap}>
          <Text style={styles.weightNumber}>
            {currentWeight}{' '}
            <Text style={styles.weightUnit}>kg</Text>
          </Text>
          <View style={styles.deltaWrap}>
            <Text style={styles.deltaText}>↓ {Math.abs(weightDelta)}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{lastWeighInDate}</Text>
      </View>

      {/* Goal Subtitle */}
      <View style={styles.goalRow}>
        <Text style={styles.goalTargetIcon}>🎯</Text>
        <Text style={styles.goalText}>
          Goal {goalWeight} kg · {toLose} kg to lose
        </Text>
      </View>

      {/* Trend Line Chart */}
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Horizontal Grid lines */}
          <Line
            x1="0"
            y1="20"
            x2={chartWidth}
            y2="20"
            stroke="#242838"
            strokeDasharray="4, 4"
            strokeWidth="1"
          />
          <Line
            x1="0"
            y1="60"
            x2={chartWidth}
            y2="60"
            stroke="#242838"
            strokeDasharray="4, 4"
            strokeWidth="1"
          />
          <Line
            x1="0"
            y1="95"
            x2={chartWidth}
            y2="95"
            stroke="#eab308"
            strokeDasharray="6, 4"
            strokeWidth="1.5"
          />

          {/* Area Fill */}
          <Path d={fillD} fill="url(#weightGrad)" />

          {/* Green Line */}
          <Path
            d={pathD}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Final Green Dot */}
          <Circle cx="370" cy="95" r="4.5" fill="#22c55e" />

          {/* Y Axis Labels */}
          <SvgText x="10" y="16" fill="#6b7280" fontSize="10">
            82.5
          </SvgText>
          <SvgText x="10" y="56" fill="#6b7280" fontSize="10">
            80
          </SvgText>
          <SvgText x="10" y="92" fill="#6b7280" fontSize="10">
            77.5
          </SvgText>

          {/* Goal Label on Right */}
          <SvgText x={chartWidth - 24} y="92" fill="#eab308" fontSize="11" fontWeight="bold">
            {goalWeight}
          </SvgText>
        </Svg>

        {/* X Axis Months Row */}
        <View style={styles.xAxisRow}>
          <Text style={styles.xMonth}>Jul</Text>
          <Text style={styles.xMonth}>Aug</Text>
          <Text style={styles.xMonth}>Sep</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161922',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  targetIcon: {
    fontSize: 13,
  },
  targetText: {
    fontSize: 14,
    color: '#eab308',
    fontWeight: '700',
  },
  logBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  logBtnText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  weightNumWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  weightNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  deltaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deltaText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  goalTargetIcon: {
    fontSize: 12,
  },
  goalText: {
    fontSize: 13,
    color: '#eab308',
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 6,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    marginTop: 6,
  },
  xMonth: {
    fontSize: 11,
    color: '#6b7280',
  },
});

export default BodyWeightTrendCard;
