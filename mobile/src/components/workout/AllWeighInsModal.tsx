import React from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useTrainerStore, WeighInRecord } from '../../store/useTrainerStore';

interface AllWeighInsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogPress?: () => void;
}

export const AllWeighInsModal: React.FC<AllWeighInsModalProps> = ({
  visible,
  onClose,
  onLogPress,
}) => {
  const topInset = useSafeTopInset(12);
  const { weighInRecords, userProfile } = useTrainerStore();
  const unit = userProfile?.unit || 'kg';

  // Sort newest first
  const sorted = React.useMemo(() => {
    return [...weighInRecords].sort((a, b) => b.date.localeCompare(a.date));
  }, [weighInRecords]);

  const renderItem = ({ item, index }: { item: WeighInRecord; index: number }) => {
    const nextItem = sorted[index + 1];
    const delta = nextItem ? item.weightKg - nextItem.weightKg : null;

    const d = new Date(item.date);
    const dateFormatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateText}>{dateFormatted}</Text>
          <Text style={styles.rawDate}>{item.date}</Text>
        </View>

        <View style={styles.weightRight}>
          <Text style={styles.weightText}>
            {item.weightKg.toFixed(1)} {unit}
          </Text>
          {delta !== null && (
            <Text
              style={[
                styles.deltaText,
                { color: delta < 0 ? '#22c55e' : delta > 0 ? '#ef4444' : '#9ca3af' },
              ]}
            >
              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} {unit}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>All Weigh-ins</Text>
            <Text style={styles.headerSubtitle}>
              {weighInRecords.length} recorded {weighInRecords.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          {onLogPress && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onLogPress();
              }}
              style={styles.logBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.logBtnText}>+ Log</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(item, idx) => `${item.date}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚖️</Text>
              <Text style={styles.emptyTitle}>No weigh-in records yet</Text>
              <Text style={styles.emptySub}>
                Tap "+ Log" to record your first weigh-in.
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#12151c',
    borderBottomWidth: 1,
    borderBottomColor: '#222736',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c202d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  logBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1c202d',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  rawDate: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  weightRight: {
    alignItems: 'flex-end',
  },
  weightText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#6b7280',
  },
});
