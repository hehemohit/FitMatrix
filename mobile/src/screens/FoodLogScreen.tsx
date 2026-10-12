import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeTopInset } from '../hooks/useSafeTopInset';
import { useTrainerStore } from '../store/useTrainerStore';
import { colors } from '../theme/colors';
import { MealEntryModal } from '../components/MealEntryModal';
import { TopFadeOverlay } from '../components/macrofactor/TopFadeOverlay';

export const FoodLogScreen: React.FC = () => {
  const { todayMeals, dailyLog, userProfile, metabolicTargets, logMeal } = useTrainerStore();
  const [modalVisible, setModalVisible] = useState(false);
  const topInset = useSafeTopInset();

  const targetCals = userProfile.target_calories || metabolicTargets.target_calories || 2400;
  const loggedCals = dailyLog.calories_logged || 0;
  const remainingCals = Math.max(0, targetCals - loggedCals);

  const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

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
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>+ Log Meal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Summary Card */}
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
    marginBottom: 20,
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
