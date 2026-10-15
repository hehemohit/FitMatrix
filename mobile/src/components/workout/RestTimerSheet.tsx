import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors } from '../../theme/colors';

interface RestTimerSheetProps {
  visible: boolean;
  onClose: () => void;
  secondsRemaining: number;
  onAdjustSeconds: (delta: number) => void;
  onStartNewTimer: (seconds: number) => void;
  onStopTimer: () => void;
}

const PRESETS = [
  { label: '0:15', sec: 15 },
  { label: '0:30', sec: 30 },
  { label: '0:45', sec: 45 },
  { label: '1:00', sec: 60 },
  { label: '1:15', sec: 75 },
  { label: '1:30', sec: 90 },
  { label: '2:00', sec: 120 },
  { label: '2:30', sec: 150 },
  { label: '3:00', sec: 180 },
];

export const RestTimerSheet: React.FC<RestTimerSheetProps> = ({
  visible,
  onClose,
  secondsRemaining,
  onAdjustSeconds,
  onStartNewTimer,
  onStopTimer,
}) => {
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Rest Timer</Text>
            <TouchableOpacity onPress={onStopTimer} style={styles.iconBtn}>
              <Text style={{ fontSize: 13, color: '#e05353', fontWeight: '700' }}>Stop</Text>
            </TouchableOpacity>
          </View>

          {/* Center Timer Controls */}
          <View style={styles.timerCenterRow}>
            <TouchableOpacity style={styles.deltaBtn} onPress={() => onAdjustSeconds(-10)}>
              <Text style={styles.deltaBtnText}>-10s</Text>
            </TouchableOpacity>

            <View style={styles.timerDisplay}>
              <Text style={styles.timerDigits}>{formatTime(secondsRemaining)}</Text>
              <Text style={styles.timerLabel}>REMAINING</Text>
            </View>

            <TouchableOpacity style={styles.deltaBtn} onPress={() => onAdjustSeconds(10)}>
              <Text style={styles.deltaBtnText}>+10s</Text>
            </TouchableOpacity>
          </View>

          {/* Preset Buttons */}
          <Text style={styles.presetsLabel}>Restart With New Timer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={`preset_${p.sec}`}
                style={styles.presetChip}
                onPress={() => onStartNewTimer(p.sec)}
              >
                <Text style={styles.presetText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1b1d22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: '#2b2e38',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444955',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconBtn: {
    padding: 6,
  },
  iconBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  timerCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 14,
  },
  deltaBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#262933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  timerDisplay: {
    alignItems: 'center',
  },
  timerDigits: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#7ba9f5',
    marginTop: 2,
  },
  presetsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#959ba8',
    marginTop: 18,
    marginBottom: 10,
  },
  presetsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  presetChip: {
    backgroundColor: '#252833',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#343846',
  },
  presetText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
