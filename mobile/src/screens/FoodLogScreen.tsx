import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeTopInset } from '../hooks/useSafeTopInset';
import { useTrainerStore } from '../store/useTrainerStore';
import { colors } from '../theme/colors';
import { MealEntryModal } from '../components/MealEntryModal';
import { TopFadeOverlay } from '../components/macrofactor/TopFadeOverlay';
import { deriveMetabolicTargets } from '../utils/metabolism';
import { estimateMealMacros, type MealItem } from '../api/coachApi';

export const FoodLogScreen: React.FC = () => {
  const { todayMeals, dailyLog, userProfile, metabolicTargets, dailyBriefing, logMeal } = useTrainerStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalCategory, setModalCategory] = useState('Lunch');
  const [modalDescription, setModalDescription] = useState('');
  const topInset = useSafeTopInset();

  // Quick AI Describe State
  const [quickText, setQuickText] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [quickDraft, setQuickDraft] = useState<{
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    serving_size?: string;
    cached?: boolean;
  } | null>(null);

  const targetCals = userProfile.target_calories || metabolicTargets.target_calories || deriveMetabolicTargets(userProfile).target_calories;
  const loggedCals = dailyLog.calories_logged || 0;
  const remainingCals = Math.max(0, targetCals - loggedCals);

  const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];
  const periCarbs = dailyBriefing?.peri_workout_carbs_g ?? 40;

  const handleQuickEstimate = async () => {
    if (!quickText.trim()) return;
    Keyboard.dismiss();
    setQuickLoading(true);
    setQuickError('');
    try {
      const res = await estimateMealMacros(quickText.trim());
      setQuickDraft(res);
    } catch {
      setQuickError('Estimation unavailable. Please try again or log manually.');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleConfirmQuickLog = async () => {
    if (!quickDraft) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const meal: MealItem = {
      name: quickDraft.name,
      category: modalCategory,
      time: timeStr,
      calories: quickDraft.calories,
      protein_g: quickDraft.protein_g,
      carbs_g: quickDraft.carbs_g,
      fats_g: quickDraft.fats_g,
    };
    await logMeal(meal);
    setQuickDraft(null);
    setQuickText('');
  };

  const handleOpenPeriWorkoutLog = () => {
    setModalCategory('Pre-Workout');
    setModalDescription(`Pre-workout fuel: ${periCarbs}g carbohydrates`);
    setModalVisible(true);
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <TopFadeOverlay />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>TODAY</Text>
          <View style={styles.headerRow}>
            <Text style={styles.pageTitle}>Food Log</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setModalCategory('Lunch');
                setModalDescription('');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>+ Log Meal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Calorie Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryVal}>{loggedCals}</Text>
            <Text style={styles.summaryLabel}>Consumed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryVal, { color: colors.accentBlue }]}>{remainingCals}</Text>
            <Text style={styles.summaryLabel}>Remaining</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryVal}>{targetCals}</Text>
            <Text style={styles.summaryLabel}>Target</Text>
          </View>
        </View>

        {/* Peri-Workout Fueling Window Banner */}
        <View style={styles.periCard}>
          <View style={styles.periLeft}>
            <Text style={styles.periIcon}>⚡</Text>
            <View style={styles.periTextGroup}>
              <Text style={styles.periTitle}>Peri-Workout Nutrient Window</Text>
              <Text style={styles.periSub}>
                Target <Text style={styles.periHighlight}>{periCarbs}g carbs</Text> + 25g fast-acting protein around training.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.periActionBtn}
            onPress={handleOpenPeriWorkoutLog}
            activeOpacity={0.8}
          >
            <Text style={styles.periActionText}>+ Fuel</Text>
          </TouchableOpacity>
        </View>

        {/* 2-Tier AI Describe Quick Food Logger Bar */}
        <View style={styles.aiDescribeCard}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiTitleGroup}>
              <Text style={styles.aiSparkle}>✨</Text>
              <Text style={styles.aiTitle}>AI Describe Quick Logger</Text>
            </View>
            <Text style={styles.aiSubBadge}>2-Tier Fast Cache</Text>
          </View>

          <View style={styles.aiInputRow}>
            <TextInput
              style={styles.aiInput}
              value={quickText}
              onChangeText={(t) => {
                setQuickText(t);
                if (quickDraft) setQuickDraft(null);
                if (quickError) setQuickError('');
              }}
              placeholder="e.g. 2 eggs, 1 toast with butter, 1 coffee"
              placeholderTextColor="#6b7280"
              returnKeyType="done"
              onSubmitEditing={handleQuickEstimate}
            />
            <TouchableOpacity
              style={[styles.aiParseBtn, quickLoading && styles.aiParseBtnDisabled]}
              onPress={handleQuickEstimate}
              disabled={quickLoading || !quickText.trim()}
              activeOpacity={0.8}
            >
              {quickLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.aiParseBtnText}>Parse ✨</Text>
              )}
            </TouchableOpacity>
          </View>

          {quickError ? (
            <Text style={styles.aiErrorText}>{quickError}</Text>
          ) : null}

          {/* Quick Confirmation Preview */}
          {quickDraft && (
            <View style={styles.draftCard}>
              <View style={styles.draftHeader}>
                <View style={styles.draftTitleGroup}>
                  <Text style={styles.draftName}>{quickDraft.name}</Text>
                  {quickDraft.cached && (
                    <View style={styles.cachedPill}>
                      <Text style={styles.cachedPillText}>⚡ Instant Cache (0ms)</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.draftCalories}>{quickDraft.calories} kcal</Text>
              </View>

              <Text style={styles.draftMacros}>
                {quickDraft.protein_g}g Protein · {quickDraft.carbs_g}g Carbs · {quickDraft.fats_g}g Fats
                {quickDraft.serving_size ? ` · ${quickDraft.serving_size}` : ''}
              </Text>

              <View style={styles.draftActionsRow}>
                <TouchableOpacity
                  style={styles.draftConfirmBtn}
                  onPress={handleConfirmQuickLog}
                  activeOpacity={0.8}
                >
                  <Text style={styles.draftConfirmText}>+ Log Meal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.draftCancelBtn}
                  onPress={() => setQuickDraft(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.draftCancelText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Meal Categories & Items */}
        {categories.map(cat => {
          const mealsInCat = todayMeals.filter(
            m => m.category?.toLowerCase() === cat.toLowerCase()
          );
          const catCalories = mealsInCat.reduce((acc, m) => acc + (m.calories || 0), 0);

          return (
            <View key={cat} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{cat}</Text>
                <Text style={styles.categoryCal}>
                  {catCalories > 0 ? `${catCalories} kcal` : '—'}
                </Text>
              </View>

              {mealsInCat.length === 0 ? (
                <Text style={styles.emptyCatText}>No meals logged for {cat}</Text>
              ) : (
                mealsInCat.map((meal, idx) => (
                  <View key={meal.meal_id || `${cat}_${idx}`} style={styles.mealItem}>
                    <View style={styles.mealLeft}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <Text style={styles.mealMeta}>
                        {meal.time ? `${meal.time} · ` : ''}{meal.protein_g}g P · {meal.carbs_g || 0}g C · {meal.fats_g || 0}g F
                      </Text>
                    </View>
                    <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <MealEntryModal
        visible={modalVisible}
        initialCategory={modalCategory}
        initialDescription={modalDescription}
        onClose={() => setModalVisible(false)}
        onLog={logMeal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.appDark,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  header: {
    marginTop: 8,
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  addBtn: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: colors.textDark,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSubtle,
    alignSelf: 'center',
  },
  periCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1b2230',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#29354a',
  },
  periLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  periIcon: {
    fontSize: 18,
  },
  periTextGroup: {
    flex: 1,
  },
  periTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentBlue,
  },
  periSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  periHighlight: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  periActionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  periActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  aiDescribeCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiSparkle: {
    fontSize: 14,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  aiSubBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    backgroundColor: '#26262a',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#121213',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  aiParseBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiParseBtnDisabled: {
    opacity: 0.5,
  },
  aiParseBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  aiErrorText: {
    color: colors.accentOrange,
    fontSize: 11,
    marginTop: 6,
  },
  draftCard: {
    marginTop: 10,
    backgroundColor: '#181a20',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2e3342',
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cachedPill: {
    backgroundColor: '#16281e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#235237',
  },
  cachedPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4ade80',
  },
  draftCalories: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accentBlue,
  },
  draftMacros: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 10,
  },
  draftActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  draftConfirmBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  draftConfirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  draftCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#26262a',
    alignItems: 'center',
  },
  draftCancelText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categoryCal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentBlue,
  },
  emptyCatText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardHeader,
  },
  mealLeft: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mealMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealCalories: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
