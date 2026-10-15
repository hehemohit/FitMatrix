import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';

interface GymCheckInCardProps {
  gymName?: string;
  onPress?: () => void;
}

export const GymCheckInCard: React.FC<GymCheckInCardProps> = ({
  gymName = 'At the gym',
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.leftRow}>
        {/* Blue QR/Grid Icon Box */}
        <View style={styles.iconBox}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
            <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
            <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
            <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
          </Svg>
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={styles.topLabel}>{gymName}</Text>
          <Text style={styles.bottomLabel}>Check in</Text>
        </View>
      </View>

      {/* Right Chevron > */}
      <Text style={styles.chevron}>›</Text>
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
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  topLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e5e7eb',
  },
  bottomLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  chevron: {
    fontSize: 22,
    color: '#6b7280',
    fontWeight: '300',
  },
});

export default GymCheckInCard;
