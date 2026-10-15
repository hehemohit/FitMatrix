import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { colors } from '../../theme/colors';
import {
  useExerciseLibraryStore,
  EQUIPMENT_OPTIONS,
  CATEGORY_OPTIONS,
} from '../../store/useExerciseLibraryStore';
import { ExerciseRecord, mapExerciseToMuscles } from '../../utils/muscleTargetMapper';
import { MuscleSkeletonMap } from './MuscleSkeletonMap';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseRecord) => void;
  title?: string;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
  title = 'Add Exercise',
}) => {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedEquipment,
    setSelectedEquipment,
    getFilteredExercises,
  } = useExerciseLibraryStore();

  const [previewExercise, setPreviewExercise] = useState<ExerciseRecord | null>(null);

  const filteredExercises = useMemo(() => {
    return getFilteredExercises().slice(0, 100); // limit to 100 for instant UI rendering
  }, [getFilteredExercises, searchQuery, selectedCategory, selectedEquipment]);

  const previewMuscles = useMemo(() => {
    if (!previewExercise) return { primary: [], secondary: [] };
    return mapExerciseToMuscles(previewExercise.target, previewExercise.secondary);
  }, [previewExercise]);

  const handleSelect = (item: ExerciseRecord) => {
    onSelectExercise(item);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search 1,324 exercises, target muscles..."
            placeholderTextColor="#777"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category Pills */}
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORY_OPTIONS}
            keyExtractor={item => `cat_${item}`}
            renderItem={({ item }) => {
              const active = selectedCategory.toLowerCase() === item.toLowerCase();
              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Equipment Pills */}
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={EQUIPMENT_OPTIONS}
            keyExtractor={item => `eq_${item}`}
            renderItem={({ item }) => {
              const active = selectedEquipment.toLowerCase() === item.toLowerCase();
              return (
                <TouchableOpacity
                  style={[styles.subFilterChip, active && styles.subFilterChipActive]}
                  onPress={() => setSelectedEquipment(item)}
                >
                  <Text style={[styles.subFilterChipText, active && styles.subFilterChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Live Muscle Preview Bar if an exercise is inspected */}
        {previewExercise && (
          <View style={styles.previewCard}>
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={1}>{previewExercise.name}</Text>
              <Text style={styles.previewTarget}>
                Target: <Text style={{ color: '#4b88eb', fontWeight: '700' }}>{previewExercise.target}</Text>
              </Text>
              <TouchableOpacity
                style={styles.confirmSelectBtn}
                onPress={() => handleSelect(previewExercise)}
              >
                <Text style={styles.confirmSelectBtnText}>+ Choose Movement</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.previewSkeletonWrap}>
              <MuscleSkeletonMap
                highlightedMuscles={previewMuscles.primary}
                secondaryMuscles={previewMuscles.secondary}
                width={50}
                height={85}
                showLabels={false}
              />
            </View>
          </View>
        )}

        {/* Exercise List */}
        <FlatList
          data={filteredExercises}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = previewExercise?.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.exerciseItem, isSelected && styles.exerciseItemActive]}
                onPress={() => setPreviewExercise(item)}
                activeOpacity={0.7}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 18 }}>🏋️</Text>
                  </View>
                )}
                <View style={styles.itemContent}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.target}</Text>
                    </View>
                    <View style={[styles.badge, styles.badgeSec]}>
                      <Text style={styles.badgeTextSec}>{item.equipment}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No exercises match your filters.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle || '#22242a',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#262930',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1e24',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#2b2f38',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  filtersWrapper: {
    marginTop: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1e2127',
    borderWidth: 1,
    borderColor: '#2f343e',
  },
  filterChipActive: {
    backgroundColor: '#4b88eb',
    borderColor: '#4b88eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b929e',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  subFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#181a1f',
  },
  subFilterChipActive: {
    backgroundColor: '#2b3648',
  },
  subFilterChipText: {
    fontSize: 11,
    color: '#767e8c',
  },
  subFilterChipTextActive: {
    color: '#78abff',
    fontWeight: '600',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: '#1b1e25',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4b88eb66',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    marginRight: 10,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  previewTarget: {
    fontSize: 12,
    color: '#9ba2b0',
    marginBottom: 8,
  },
  confirmSelectBtn: {
    backgroundColor: '#4b88eb',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  confirmSelectBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  previewSkeletonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1d2026',
  },
  exerciseItemActive: {
    backgroundColor: '#1b202a',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#20232a',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e4e7ed',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#252a35',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#7ba9f5',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeSec: {
    backgroundColor: '#1f2127',
  },
  badgeTextSec: {
    fontSize: 10,
    color: '#828994',
    textTransform: 'capitalize',
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#262b35',
  },
  addBtnText: {
    color: '#4b88eb',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#717885',
    fontSize: 13,
  },
});
