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
import { WeighInRecord } from '../../store/useTrainerStore';

interface BodyWeightTrendCardProps {
  currentWeight?: number;
  goalWeight?: number;
  weightDelta?: number;
  lastWeighInDate?: string;
  weighInRecords?: WeighInRecord[];
  onLogPress?: () => void;
  onGoalPress?: () => void;
  onAllWeighInsPress?: () => void;
}

// Catmull-Rom spline to cubic bezier converter for ultra-smooth charting
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

export const BodyWeightTrendCard: React.FC<BodyWeightTrendCardProps> = ({
  currentWeight = 78.4,
  goalWeight = 77.0,
  weightDelta,
  lastWeighInDate,
  weighInRecords = [],
  onLogPress,
  onGoalPress,
  onAllWeighInsPress,
}) => {
  const cardWidth = Dimensions.get('window').width - 32;
  const chartWidth = cardWidth - 32;
  const chartHeight = 120;

  // Derive points from real records or realistic smooth baseline
  const { points, displayDelta, displayDate, maxYVal, minYVal, lastPoint } = React.useMemo(() => {
    let rawWeights: { date: string; weight: number }[] = [];

    if (weighInRecords && weighInRecords.length >= 2) {
      rawWeights = weighInRecords.map(r => ({ date: r.date, weight: r.weightKg }));
    } else if (weighInRecords && weighInRecords.length === 1) {
      // 1 record exists — synthesize a 30-day gentle trend leading up to this record
      const single = weighInRecords[0];
      const startW = single.weightKg + 0.8;
      rawWeights = [
        { date: '2026-07-15', weight: startW },
        { date: '2026-08-01', weight: startW - 0.2 },
        { date: '2026-08-15', weight: startW - 0.5 },
        { date: single.date, weight: single.weightKg },
      ];
    } else {
      // Realistic baseline matching currentWeight
      const cur = currentWeight || 78.4;
      rawWeights = [
        { date: '2026-07-10', weight: cur + 1.2 },
        { date: '2026-07-25', weight: cur + 0.9 },
        { date: '2026-08-10', weight: cur + 0.6 },
        { date: '2026-08-25', weight: cur + 0.3 },
        { date: '2026-09-10', weight: cur },
      ];
    }

    const weightsOnly = rawWeights.map(r => r.weight);
    const minW = Math.min(...weightsOnly, goalWeight) - 0.5;
    const maxW = Math.max(...weightsOnly) + 0.5;
    const range = Math.max(0.1, maxW - minW);

    const paddingX = 14;
    const usableWidth = chartWidth - paddingX * 2;
    const topPadding = 18;
    const usableHeight = chartHeight - topPadding - 18;

    const computedPoints = rawWeights.map((item, idx) => {
      const x = paddingX + (idx / Math.max(1, rawWeights.length - 1)) * usableWidth;
      // Invert Y so highest weight is at top
      const normalizedY = (item.weight - minW) / range;
      const y = chartHeight - 16 - normalizedY * usableHeight;
      return { x, y, weight: item.weight, date: item.date };
    });

    // Compute delta
    const firstWeight = rawWeights[0].weight;
    const latestWeight = rawWeights[rawWeights.length - 1].weight;
    const computedDelta =
      weightDelta !== undefined
        ? weightDelta
        : Number((latestWeight - firstWeight).toFixed(1));

    // Compute date string
    let dateStr = lastWeighInDate;
    if (!dateStr && rawWeights.length > 0) {
      const latestDate = new Date(rawWeights[rawWeights.length - 1].date);
      dateStr = latestDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }

    return {
      points: computedPoints,
      displayDelta: computedDelta,
      displayDate: dateStr || 'Thu 10 Sep',
      maxYVal: Number(maxW.toFixed(1)),
      minYVal: Number(minW.toFixed(1)),
      lastPoint: computedPoints[computedPoints.length - 1] || { x: chartWidth - 14, y: 95 },
    };
  }, [weighInRecords, currentWeight, goalWeight, weightDelta, lastWeighInDate, chartWidth, chartHeight]);

  const toLose = Math.max(0, currentWeight - goalWeight).toFixed(1);

  const pathD = React.useMemo(() => getSmoothPath(points), [points]);
  const firstPt = points[0] || { x: 10, y: chartHeight };
  const fillD = `${pathD} L ${lastPoint.x.toFixed(1)} ${chartHeight} L ${firstPt.x.toFixed(1)} ${chartHeight} Z`;

  // Goal line Y position
  const goalRange = Math.max(0.1, maxYVal - minYVal);
  const goalNormY = Math.min(1, Math.max(0, (goalWeight - minYVal) / goalRange));
  const goalLineY = chartHeight - 16 - goalNormY * (chartHeight - 36);

  // Dynamic X-axis month labels (e.g. Jul, Aug, Sep)
  const monthLabels = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const curMonthIdx = new Date().getMonth();
    const m1 = months[(curMonthIdx - 2 + 12) % 12];
    const m2 = months[(curMonthIdx - 1 + 12) % 12];
    const m3 = months[curMonthIdx];
    return [m1, m2, m3];
  }, []);

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Body weight</Text>
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.targetBadge}
            onPress={onGoalPress}
            activeOpacity={onGoalPress ? 0.7 : 1}
          >
            <Text style={styles.targetIcon}>🎯</Text>
            <Text style={styles.targetText}>{goalWeight}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={onLogPress}
            activeOpacity={0.7}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
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
            <Text
              style={[
                styles.deltaText,
                displayDelta > 0 && { color: '#ef4444' },
              ]}
            >
              {displayDelta <= 0 ? '↓' : '↑'} {Math.abs(displayDelta)}
            </Text>
          </View>
        </View>
        <Text style={styles.dateText}>{displayDate}</Text>
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
            y1={goalLineY}
            x2={chartWidth}
            y2={goalLineY}
            stroke="#eab308"
            strokeDasharray="6, 4"
            strokeWidth="1.5"
          />

          {/* Area Fill */}
          {fillD ? <Path d={fillD} fill="url(#weightGrad)" /> : null}

          {/* Green Line */}
          {pathD ? (
            <Path
              d={pathD}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : null}

          {/* Final Green Dot */}
          <Circle cx={lastPoint.x} cy={lastPoint.y} r="4.5" fill="#22c55e" />

          {/* Y Axis Labels */}
          <SvgText x="10" y="16" fill="#6b7280" fontSize="10">
            {maxYVal}
          </SvgText>
          <SvgText x="10" y="56" fill="#6b7280" fontSize="10">
            {Number(((maxYVal + minYVal) / 2).toFixed(1))}
          </SvgText>
          <SvgText x="10" y={Math.max(25, goalLineY - 4)} fill="#eab308" fontSize="10">
            {goalWeight}
          </SvgText>

          {/* Goal Label on Right */}
          <SvgText x={chartWidth - 26} y={Math.max(25, goalLineY - 4)} fill="#eab308" fontSize="11" fontWeight="bold">
            {goalWeight}
          </SvgText>
        </Svg>

        {/* X Axis Months Row */}
        <View style={styles.xAxisRow}>
          <Text style={styles.xMonth}>{monthLabels[0]}</Text>
          <Text style={styles.xMonth}>{monthLabels[1]}</Text>
          <Text style={styles.xMonth}>{monthLabels[2]}</Text>
        </View>
      </View>

      {onAllWeighInsPress && (
        <TouchableOpacity
          style={styles.allWeighInsRow}
          onPress={onAllWeighInsPress}
          activeOpacity={0.7}
        >
          <Text style={styles.allWeighInsText}>All weigh-ins ›</Text>
        </TouchableOpacity>
      )}
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
  allWeighInsRow: {
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#202434',
  },
  allWeighInsText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '700',
  },
});

export default BodyWeightTrendCard;
