import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useExerciseLibraryStore } from '../../store/useExerciseLibraryStore';
import { useDashboardTabStore } from '../../store/useDashboardTabStore';
import { ExerciseRecord } from '../../utils/muscleTargetMapper';
import { AnatomicalSilhouette } from '../../components/workout/AnatomicalSilhouette';

interface WorkoutExercisesScreenProps {
  onSelectExercise?: (exercise: ExerciseRecord) => void;
  onAddToPlan?: (exercise: ExerciseRecord) => void;
}

const CATEGORIES = [
  'All',
  'Back',
  'Cardio',
  'Chest',
  'Full Body',
  'Abs',
  'Arms',
  'Legs',
  'Shoulders',
];

const EQUIPMENTS = [
  'Any equipment',
  'Body Weight',
  'Dumbbell',
  'Barbell',
  'Cable',
  'Machine',
];

export const WorkoutExercisesScreen: React.FC<WorkoutExercisesScreenProps> = ({
  onSelectExercise,
  onAddToPlan,
}) => {
  const topInset = useSafeTopInset(10);
  const { exercises: libraryExercises, addCustomExercise } = useExerciseLibraryStore();
  const { setActiveDashboard } = useDashboardTabStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('Any equipment');
  const [byMuscleModalVisible, setByMuscleModalVisible] = useState(false);
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string | null>(null);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    let list = libraryExercises;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.equipment.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'All') {
      const cat = selectedCategory.toLowerCase();
      list = list.filter(
        e =>
          e.category.toLowerCase().includes(cat) ||
          e.target.toLowerCase().includes(cat)
      );
    }

    if (selectedEquipment !== 'Any equipment') {
      const eq = selectedEquipment.toLowerCase();
      list = list.filter(e => e.equipment.toLowerCase().includes(eq));
    }

    if (selectedMuscleFilter) {
      const mf = selectedMuscleFilter.toLowerCase();
      list = list.filter(e => e.target.toLowerCase().includes(mf));
    }

    return list;
  }, [libraryExercises, searchQuery, selectedCategory, selectedEquipment, selectedMuscleFilter]);

  const totalCount = libraryExercises.length > 0 ? libraryExercises.length : 1324;

  const renderExerciseItem = ({ item }: { item: ExerciseRecord }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => onSelectExercise && onSelectExercise(item)}
      activeOpacity={0.8}
    >
      {/* White Thumbnail Box with Preview */}
      <View style={styles.thumbnailBox}>
        {item.gifUrl ? (
          <Image
            source={{ uri: item.gifUrl }}
            style={styles.thumbnailImage}
            resizeMode="contain"
          />
        ) : (
          <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 4V20M18 4V20M4 8H8M4 16H8M16 8H20M16 16H20M8 12H16"
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        )}
      </View>

      {/* Info */}
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.exerciseSubtitle} numberOfLines={1}>
          {item.target.charAt(0).toUpperCase() + item.target.slice(1)} ·{' '}
          {item.equipment.charAt(0).toUpperCase() + item.equipment.slice(1)}
        </Text>
      </View>

      {/* + Plan Button */}
      <TouchableOpacity
        style={styles.planBtn}
        onPress={() => onAddToPlan && onAddToPlan(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.planBtnText}>+ Plan</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>Exercises</Text>
          <Text style={styles.subtitle}>{totalCount} exercises with animations</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Nutrition Switcher Button */}
          <TouchableOpacity
            style={styles.switcherBtn}
            onPress={() => setActiveDashboard('nutrition')}
            activeOpacity={0.8}
          >
            <Text style={styles.switcherText}>🍎 Nutrition</Text>
          </TouchableOpacity>

          {/* By Muscle Button */}
          <TouchableOpacity
            style={[
              styles.byMuscleBtn,
              selectedMuscleFilter && styles.byMuscleBtnActive,
            ]}
            onPress={() => setByMuscleModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.byMuscleTargetIcon}>🎯</Text>
            <Text style={styles.byMuscleText}>
              {selectedMuscleFilter ? selectedMuscleFilter : 'By muscle'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="8" stroke="#6b7280" strokeWidth="2" />
          <Path d="M21 21L16.65 16.65" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Row 1: Body Part / Category */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                selectedCategory === cat && styles.chipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat && styles.chipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filter Row 2: Equipment */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {EQUIPMENTS.map(eq => (
            <TouchableOpacity
              key={eq}
              style={[
                styles.chip,
                selectedEquipment === eq && styles.chipActive,
              ]}
              onPress={() => setSelectedEquipment(eq)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedEquipment === eq && styles.chipTextActive,
                ]}
              >
                {eq}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Exercise List with Custom Exercise Card at Header */}
      <FlatList
        data={filteredExercises}
        keyExtractor={item => item.id}
        renderItem={renderExerciseItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          /* Create Your Own Exercise Card */
          <TouchableOpacity
            style={styles.createExerciseCard}
            onPress={() => {
              addCustomExercise({
                name: 'Custom Movement',
                target: 'chest',
                equipment: 'dumbbell',
                category: 'strength',
                secondary: [],
                image: '',
                gifUrl: '',
              });
            }}
            activeOpacity={0.8}
          >
            <View style={styles.createLeft}>
              <View style={styles.createIconBox}>
                <Text style={styles.createSparkle}>✦</Text>
              </View>
              <View>
                <Text style={styles.createTitle}>Create your own exercise</Text>
                <Text style={styles.createSubtitle}>name + body part, no animation</Text>
              </View>
            </View>
            <Text style={styles.createPlus}>+</Text>
          </TouchableOpacity>
        }
      />

      {/* By Muscle Modal */}
      <Modal
        visible={byMuscleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setByMuscleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Muscle</Text>
              <TouchableOpacity
                onPress={() => setByMuscleModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Tap any muscle group on the front or back silhouette to filter exercises.
            </Text>

            <AnatomicalSilhouette
              gender="male"
              selectedMuscle={selectedMuscleFilter}
              onSelectMuscle={m => {
                setSelectedMuscleFilter(m === selectedMuscleFilter ? null : m);
                setByMuscleModalVisible(false);
              }}
              height={360}
            />

            {selectedMuscleFilter && (
              <TouchableOpacity
                style={styles.clearMuscleBtn}
                onPress={() => {
                  setSelectedMuscleFilter(null);
                  setByMuscleModalVisible(false);
                }}
              >
                <Text style={styles.clearMuscleText}>Clear Muscle Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0a0c10',
  },
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switcherBtn: {
    backgroundColor: '#1c1f2a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3344',
  },
  switcherText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  byMuscleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#102319',
    borderWidth: 1,
    borderColor: '#1e402c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  byMuscleBtnActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  byMuscleTargetIcon: {
    fontSize: 12,
  },
  byMuscleText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161922',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#242838',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearSearch: {
    color: '#9ca3af',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  chipsRow: {
    marginBottom: 8,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#161922',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242838',
  },
  chipActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  chipText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  createExerciseCard: {
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#242838',
    marginBottom: 10,
  },
  createLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#232838',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createSparkle: {
    fontSize: 18,
    color: '#9ca3af',
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  createSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  createPlus: {
    fontSize: 22,
    color: '#9ca3af',
    fontWeight: '300',
    marginRight: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  exerciseCard: {
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#242838',
  },
  thumbnailBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 10,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  exerciseSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  planBtn: {
    backgroundColor: '#152b20',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planBtnText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#12141c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#242838',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 18,
    color: '#9ca3af',
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
  },
  clearMuscleBtn: {
    backgroundColor: '#1c1f2a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  clearMuscleText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WorkoutExercisesScreen;
