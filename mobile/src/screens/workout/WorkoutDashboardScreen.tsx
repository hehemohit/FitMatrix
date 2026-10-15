import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { colors } from '../../theme/colors';
import { useTrainerStore } from '../../store/useTrainerStore';
import { useExerciseLibraryStore } from '../../store/useExerciseLibraryStore';
import { ExerciseRecord, MuscleKey, mapExerciseToMuscles } from '../../utils/muscleTargetMapper';
import { MuscleSkeletonMap } from '../../components/workout/MuscleSkeletonMap';
import { WorkoutPreviewModal, RoutinePreviewItem } from '../../components/workout/WorkoutPreviewModal';
import { AddExerciseModal } from '../../components/workout/AddExerciseModal';
import { ExerciseInfoModal } from '../../components/workout/ExerciseInfoModal';

interface WorkoutDashboardScreenProps {
  onClose: () => void;
  onStartWorkout: (
    name: string,
    exercises: (ExerciseRecord & { targetSets?: number; targetReps?: string | number })[]
  ) => void;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WorkoutDashboardScreen: React.FC<WorkoutDashboardScreenProps> = ({
  onClose,
  onStartWorkout,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = useSafeTopInset(10);

  const { workoutPlan, planLoading, generatePlan } = useTrainerStore();
  const { exercises: libraryExercises } = useExerciseLibraryStore();

  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<{
    title: string;
    subtitle: string;
    exercises: RoutinePreviewItem[];
  } | null>(null);

  const [browseLibraryVisible, setBrowseLibraryVisible] = useState(false);
  const [infoModalExercise, setInfoModalExercise] = useState<ExerciseRecord | null>(null);

  // Today index (0 = Monday ... 6 = Sunday)
  const currentDayIndex = useMemo(() => {
    const day = new Date().getDay(); // 0 is Sun, 1 is Mon...
    return day === 0 ? 6 : day - 1;
  }, []);

  const searchInLibrary = (query: string): ExerciseRecord | undefined => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    return libraryExercises.find(e => e.name.toLowerCase().includes(q));
  };

  // Helper to map an AI-Coach plan day or raw exercise into library ExerciseRecords
  const mapExercisesToLibrary = (
    rawExercises: { name: string; sets?: number; reps?: number | string }[]
  ): RoutinePreviewItem[] => {
    return rawExercises.map((raw, idx) => {
      // Fuzzy search in the 1,324 dataset
      const found = searchInLibrary(raw.name);
      if (found) {
        return {
          id: found.id,
          name: found.name,
          category: found.category,
          target: found.target,
          secondary: found.secondary,
          equipment: found.equipment,
          image: found.image,
          gifUrl: found.gifUrl,
          targetSets: raw.sets || 3,
          targetReps: raw.reps || '8-10 reps',
        };
      }
      return {
        id: `custom_${idx}_${Date.now()}`,
        name: raw.name,
        category: 'strength',
        target: 'full body',
        secondary: [],
        equipment: 'barbell',
        targetSets: raw.sets || 3,
        targetReps: raw.reps || '8-10 reps',
      };
    });
  };

  // Pre-built Split Templates from the 1,324 dataset
  const splitTemplates = useMemo(() => {
    const getMovement = (query: string): ExerciseRecord => {
      const found = searchInLibrary(query);
      return found || libraryExercises[0] || {
        id: query,
        name: query,
        category: 'strength',
        target: 'chest',
        secondary: [],
        equipment: 'barbell',
        image: '',
        gifUrl: '',
        instructions: [],
      };
    };

    return [
      {
        id: 'push_hypertrophy',
        title: 'Push Hypertrophy',
        subtitle: 'Chest • Shoulders • Triceps',
        tag: 'Hypertrophy',
        estMins: 50,
        exercises: [
          { ...getMovement('Barbell Bench Press'), targetSets: 4, targetReps: '8-10' },
          { ...getMovement('Dumbbell Incline Bench Press'), targetSets: 3, targetReps: '10-12' },
          { ...getMovement('Overhead Press'), targetSets: 3, targetReps: '8-10' },
          { ...getMovement('Lateral Raise'), targetSets: 4, targetReps: '12-15' },
          { ...getMovement('Triceps Pushdown'), targetSets: 3, targetReps: '12-15' },
        ],
      },
      {
        id: 'pull_power',
        title: 'Pull Power',
        subtitle: 'Back • Biceps • Rear Delts',
        tag: 'Strength',
        estMins: 50,
        exercises: [
          { ...getMovement('Deadlift'), targetSets: 4, targetReps: '5-8' },
          { ...getMovement('Barbell Bent Over Row'), targetSets: 4, targetReps: '8-10' },
          { ...getMovement('Lat Pulldown'), targetSets: 3, targetReps: '10-12' },
          { ...getMovement('Barbell Curl'), targetSets: 3, targetReps: '10-12' },
          { ...getMovement('Face Pull'), targetSets: 3, targetReps: '15' },
        ],
      },
      {
        id: 'legs_core',
        title: 'Legs & Core Foundation',
        subtitle: 'Quads • Hamstrings • Core',
        tag: 'Lower Body',
        estMins: 55,
        exercises: [
          { ...getMovement('Barbell Squat'), targetSets: 4, targetReps: '6-8' },
          { ...getMovement('Romanian Deadlift'), targetSets: 3, targetReps: '8-10' },
          { ...getMovement('Leg Press'), targetSets: 3, targetReps: '10-12' },
          { ...getMovement('Calf Raise'), targetSets: 4, targetReps: '15' },
          { ...getMovement('Plank'), targetSets: 3, targetReps: '60s' },
        ],
      },
      {
        id: 'full_body',
        title: 'Full Body Blitz',
        subtitle: 'Total Athletic Conditioning',
        tag: 'Full Body',
        estMins: 45,
        exercises: [
          { ...getMovement('Barbell Squat'), targetSets: 3, targetReps: '8' },
          { ...getMovement('Barbell Bench Press'), targetSets: 3, targetReps: '8' },
          { ...getMovement('Pull-Up'), targetSets: 3, targetReps: 'Max' },
          { ...getMovement('Overhead Press'), targetSets: 3, targetReps: '10' },
        ],
      },
    ];
  }, [libraryExercises]);

  const handleOpenTemplate = (template: typeof splitTemplates[0]) => {
    setSelectedRoutine({
      title: template.title,
      subtitle: template.subtitle,
      exercises: template.exercises.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        target: e.target,
        secondary: e.secondary,
        equipment: e.equipment,
        image: e.image,
        gifUrl: e.gifUrl,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      })),
    });
    setPreviewModalVisible(true);
  };

  const handleOpenAiDay = (day: any) => {
    const mapped = mapExercisesToLibrary(day.exercises);
    setSelectedRoutine({
      title: `${day.day} — ${day.targetMuscleGroups ? day.targetMuscleGroups.join(', ') : 'AI Routine'}`,
      subtitle: '⚡ Recommended by AI Coach',
      exercises: mapped,
    });
    setPreviewModalVisible(true);
  };

  const handleStartEmpty = () => {
    onStartWorkout('Empty Workout', []);
    onClose();
  };

  // Active muscle groups for the anatomy balance widget
  const weeklyMuscles = useMemo(() => {
    const list: MuscleKey[] = ['chest', 'lats', 'quads', 'front_delts', 'biceps', 'triceps'];
    return list;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Workout Dashboard</Text>
          <View style={styles.coachSyncRow}>
            <View style={styles.syncDot} />
            <Text style={styles.coachSyncText}>AI Coach Ready</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => generatePlan('workout')}
          style={styles.refreshAiBtn}
          activeOpacity={0.7}
          disabled={planLoading}
        >
          {planLoading ? (
            <ActivityIndicator size="small" color="#60a5fa" />
          ) : (
            <Text style={styles.refreshAiIcon}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Day Strip */}
        <View style={styles.weekStrip}>
          {WEEK_DAYS.map((dayName, idx) => {
            const isToday = idx === currentDayIndex;
            return (
              <View key={dayName} style={[styles.dayPill, isToday && styles.dayPillActive]}>
                <Text style={[styles.dayPillName, isToday && styles.dayPillTextActive]}>{dayName}</Text>
                <View style={[styles.dayDot, isToday && styles.dayDotActive]} />
              </View>
            );
          })}
        </View>

        {/* 1. HERO SECTION: AI-Coach Recommendation */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🤖 AI Coach Training Plan</Text>
          {workoutPlan && (
            <TouchableOpacity onPress={() => generatePlan('workout')}>
              <Text style={styles.sectionActionText}>Regenerate</Text>
            </TouchableOpacity>
          )}
        </View>

        {workoutPlan && workoutPlan.days && workoutPlan.days.length > 0 ? (
          <View style={styles.aiPlanCard}>
            <View style={styles.aiPlanTopRow}>
              <View>
                <Text style={styles.aiPlanGoal}>
                  {workoutPlan.fitnessGoal ? workoutPlan.fitnessGoal.toUpperCase() : 'TARGET PROGRAM'}
                </Text>
                <Text style={styles.aiPlanTitle}>Personalized Split</Text>
              </View>
              <View style={styles.aiPlanBadge}>
                <Text style={styles.aiPlanBadgeText}>{workoutPlan.days.length} Days/Wk</Text>
              </View>
            </View>

            <Text style={styles.aiPlanSub}>
              Tailored to your body composition, recovery markers, and strength goals.
            </Text>

            {/* AI Days Horizontal Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiDaysScroll}>
              {workoutPlan.days.map((day, dIdx) => (
                <TouchableOpacity
                  key={`day_${dIdx}`}
                  style={styles.aiDayCard}
                  onPress={() => handleOpenAiDay(day)}
                  activeOpacity={0.8}
                >
                  <View style={styles.aiDayHeader}>
                    <Text style={styles.aiDayName}>{day.day}</Text>
                    <Text style={styles.aiDayExCount}>{day.exercises?.length || 0} moves</Text>
                  </View>
                  <Text style={styles.aiDayMuscles} numberOfLines={2}>
                    {day.targetMuscleGroups ? day.targetMuscleGroups.join(' • ') : 'Mixed Groups'}
                  </Text>
                  <View style={styles.aiDayStartBtn}>
                    <Text style={styles.aiDayStartText}>Preview & Log ➔</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.aiEmptyCard}>
            <Text style={styles.aiEmptyIcon}>🧠</Text>
            <Text style={styles.aiEmptyTitle}>Generate Your AI Workout Plan</Text>
            <Text style={styles.aiEmptySub}>
              FitMatrix AI will craft a custom routine based on your fitness level, target muscles, and recovery readiness.
            </Text>
            <TouchableOpacity
              style={styles.generateAiBtn}
              onPress={() => generatePlan('workout')}
              disabled={planLoading}
              activeOpacity={0.85}
            >
              {planLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.generateAiBtnIcon}>✨</Text>
                  <Text style={styles.generateAiBtnText}>Generate Custom AI Plan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 2. QUICK ACTIONS ROW */}
        <View style={styles.quickActionsRow}>
          {/* Start Empty Session */}
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={handleStartEmpty}
            activeOpacity={0.8}
          >
            <View style={[styles.qaIconWrap, { backgroundColor: '#1e3a5f' }]}>
              <Text style={styles.qaIcon}>➕</Text>
            </View>
            <Text style={styles.qaTitle}>Empty Workout</Text>
            <Text style={styles.qaSub}>Build as you go</Text>
          </TouchableOpacity>

          {/* Browse Library */}
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setBrowseLibraryVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.qaIconWrap, { backgroundColor: '#2d2547' }]}>
              <Text style={styles.qaIcon}>📚</Text>
            </View>
            <Text style={styles.qaTitle}>1,324 Exercises</Text>
            <Text style={styles.qaSub}>Browse library</Text>
          </TouchableOpacity>
        </View>

        {/* 3. SPLIT TEMPLATES SECTION */}
        <Text style={styles.sectionTitle}>Curated Training Splits</Text>
        <View style={styles.templatesList}>
          {splitTemplates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleOpenTemplate(template)}
              activeOpacity={0.8}
            >
              <View style={styles.tplLeft}>
                <View style={styles.tplTagBadge}>
                  <Text style={styles.tplTagText}>{template.tag}</Text>
                </View>
                <Text style={styles.tplTitle}>{template.title}</Text>
                <Text style={styles.tplSubtitle}>{template.subtitle}</Text>
                <View style={styles.tplMetaRow}>
                  <Text style={styles.tplMetaText}>{template.exercises.length} Exercises</Text>
                  <Text style={styles.tplMetaDot}>•</Text>
                  <Text style={styles.tplMetaText}>~{template.estMins} Mins</Text>
                </View>
              </View>
              <View style={styles.tplRight}>
                <View style={styles.tplArrowBtn}>
                  <Text style={styles.tplArrowText}>▶</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. MUSCLE VOLUME & BALANCE SECTION */}
        <Text style={styles.sectionTitle}>Weekly Muscle Balance</Text>
        <View style={styles.balanceCard}>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceTitle}>Anatomical Coverage</Text>
            <Text style={styles.balanceSub}>
              Highlighted muscles indicate active training volume this week. Balanced recovery ensures optimal growth.
            </Text>
            <View style={styles.balancePill}>
              <Text style={styles.balancePillText}>Optimal Split Balance</Text>
            </View>
          </View>
          <View style={styles.balanceSkeletonWrap}>
            <MuscleSkeletonMap
              highlightedMuscles={weeklyMuscles}
              width={90}
              height={160}
              showLabels={false}
            />
          </View>
        </View>
      </ScrollView>

      {/* Routine Preview Modal */}
      {selectedRoutine && (
        <WorkoutPreviewModal
          visible={previewModalVisible}
          onClose={() => {
            setPreviewModalVisible(false);
            setSelectedRoutine(null);
          }}
          title={selectedRoutine.title}
          subtitle={selectedRoutine.subtitle}
          exercises={selectedRoutine.exercises}
          onStartWorkout={(name, exList) => {
            onStartWorkout(name, exList);
            onClose();
          }}
        />
      )}

      {/* Exercise Library Browser Modal */}
      <AddExerciseModal
        visible={browseLibraryVisible}
        onClose={() => setBrowseLibraryVisible(false)}
        onSelectExercise={selected => {
          setBrowseLibraryVisible(false);
          setInfoModalExercise(selected);
        }}
        title="Browse 1,324 Exercises"
      />

      {/* Exercise Detail Info Modal */}
      <ExerciseInfoModal
        visible={!!infoModalExercise}
        onClose={() => setInfoModalExercise(null)}
        exercise={infoModalExercise}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111317',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#161920',
    borderBottomWidth: 1,
    borderBottomColor: '#1f242e',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222733',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  coachSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
    marginRight: 6,
  },
  coachSyncText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  refreshAiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e2430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshAiIcon: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161920',
    borderRadius: 14,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#20242e',
  },
  dayPill: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  dayPillActive: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  dayPillName: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayPillTextActive: {
    color: '#60a5fa',
    fontWeight: '900',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dayDotActive: {
    backgroundColor: '#3b82f6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  sectionActionText: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '700',
  },
  aiPlanCard: {
    backgroundColor: '#151922',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#252c3d',
    marginBottom: 20,
  },
  aiPlanTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  aiPlanGoal: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiPlanTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  aiPlanBadge: {
    backgroundColor: '#1e2d45',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b3f63',
  },
  aiPlanBadgeText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
  },
  aiPlanSub: {
    color: '#717f96',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  aiDaysScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  aiDayCard: {
    width: 155,
    backgroundColor: '#1b202c',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#293245',
  },
  aiDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiDayName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  aiDayExCount: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  aiDayMuscles: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
    height: 30,
  },
  aiDayStartBtn: {
    backgroundColor: '#242d3e',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  aiDayStartText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
  },
  aiEmptyCard: {
    backgroundColor: '#151922',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252c3d',
    marginBottom: 20,
  },
  aiEmptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  aiEmptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  aiEmptySub: {
    color: '#717f96',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  generateAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  generateAiBtnIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  generateAiBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222836',
  },
  qaIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qaIcon: {
    fontSize: 18,
  },
  qaTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  qaSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  templatesList: {
    gap: 10,
    marginBottom: 24,
  },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222836',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tplLeft: {
    flex: 1,
    paddingRight: 10,
  },
  tplTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e2433',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  tplTagText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tplTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  tplSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  tplMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tplMetaText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  tplMetaDot: {
    color: '#475569',
    fontSize: 11,
    marginHorizontal: 6,
  },
  tplRight: {
    justifyContent: 'center',
  },
  tplArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e2638',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2c374d',
  },
  tplArrowText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 2,
  },
  balanceCard: {
    flexDirection: 'row',
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222836',
    alignItems: 'center',
  },
  balanceInfo: {
    flex: 1,
    paddingRight: 12,
  },
  balanceTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  balanceSub: {
    color: '#717f96',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  balancePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e2e28',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#244535',
  },
  balancePillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  balanceSkeletonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111317',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1e222c',
  },
});
