import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ActiveWorkoutExercise } from '../../store/useWorkoutSessionStore';

interface ExerciseCarouselProps {
  exercises: ActiveWorkoutExercise[];
  activeIndex: number;
  onSelectIndex: (idx: number) => void;
  onAddExercise: () => void;
}

export const ExerciseCarousel: React.FC<ExerciseCarouselProps> = ({
  exercises,
  activeIndex,
  onSelectIndex,
  onAddExercise,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {exercises.map((ex, idx) => {
          const isActive = idx === activeIndex;
          const isAllCompleted = ex.sets.length > 0 && ex.sets.every(s => s.isCompleted);

          return (
            <TouchableOpacity
              key={ex.instanceId || `ex_${idx}`}
              style={[styles.itemWrapper, isActive && styles.itemWrapperActive]}
              onPress={() => onSelectIndex(idx)}
              activeOpacity={0.7}
            >
              <View style={styles.thumbContainer}>
                {ex.image ? (
                  <Image source={{ uri: ex.image }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.placeholder]}>
                    <Text style={{ fontSize: 16 }}>🏋️</Text>
                  </View>
                )}

                {isAllCompleted && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </View>

              {/* Active Indicator Bar */}
              <View style={[styles.indicatorBar, isActive && styles.indicatorBarActive]} />
            </TouchableOpacity>
          );
        })}

        {/* Add Exercise (+) Button */}
        <TouchableOpacity style={styles.addBtn} onPress={onAddExercise} activeOpacity={0.7}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121418',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#20232a',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  itemWrapper: {
    alignItems: 'center',
  },
  itemWrapperActive: {},
  thumbContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#1c1f26',
    borderWidth: 1,
    borderColor: '#292d37',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2ecc71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  indicatorBar: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'transparent',
    marginTop: 6,
  },
  indicatorBarActive: {
    backgroundColor: '#fff',
  },
  addBtn: {
    width: 58,
    height: 58,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#303542',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161920',
  },
  addIcon: {
    fontSize: 22,
    color: '#838b99',
    fontWeight: '300',
  },
});
