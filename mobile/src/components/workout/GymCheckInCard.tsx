import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { useGymCheckInStore } from '../../store/useGymCheckInStore';

interface GymCheckInCardProps {
  gymName?: string;
  onPress?: () => void;
}

export const GymCheckInCard: React.FC<GymCheckInCardProps> = ({
  gymName = 'FitMatrix Partner Gym',
  onPress,
}) => {
  const { activeCheckIn, toggleCheckIn } = useGymCheckInStore();

  const isCheckedIn = !!activeCheckIn;

  const handlePress = () => {
    toggleCheckIn(gymName);
    if (onPress) {
      onPress();
    }
  };

  // Format check-in time if active
  const checkInTimeFormatted = React.useMemo(() => {
    if (!activeCheckIn?.checkInTime) return '';
    const date = new Date(activeCheckIn.checkInTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [activeCheckIn?.checkInTime]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCheckedIn && styles.cardActive,
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.leftRow}>
        {/* QR or Checkmark Icon Box */}
        <View
          style={[
            styles.iconBox,
            isCheckedIn && styles.iconBoxActive,
          ]}
        >
          {isCheckedIn ? (
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 6L9 17L4 12"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : (
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
              <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
              <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
              <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#ffffff" strokeWidth="2" />
            </Svg>
          )}
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={[styles.topLabel, isCheckedIn && styles.topLabelActive]}>
            {isCheckedIn ? `Checked in · ${checkInTimeFormatted}` : 'At the gym'}
          </Text>
          <Text style={styles.bottomLabel}>
            {isCheckedIn
              ? `${activeCheckIn.gymName || gymName} · Tap to check out`
              : 'Check in'}
          </Text>
        </View>
      </View>

      {/* Right Indicator */}
      <Text style={[styles.chevron, isCheckedIn && styles.chevronActive]}>
        {isCheckedIn ? '✓' : '›'}
      </Text>
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
  cardActive: {
    backgroundColor: '#0d2217',
    borderColor: '#16a34a',
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
  iconBoxActive: {
    backgroundColor: '#16a34a',
  },
  textWrap: {
    flex: 1,
  },
  topLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
  },
  topLabelActive: {
    color: '#4ade80',
    fontWeight: '600',
  },
  bottomLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#6b7280',
    fontWeight: '300',
    marginLeft: 8,
  },
  chevronActive: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default GymCheckInCard;
