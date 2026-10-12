import React from 'react';
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
import { TopFadeOverlay } from '../components/macrofactor/TopFadeOverlay';

export const StrategyScreen: React.FC = () => {
  const { metabolicTargets, userProfile } = useTrainerStore();
  const topInset = useSafeTopInset();

  const tdee = metabolicTargets.tdee || 2640;
  const targetCals = userProfile.target_calories || metabolicTargets.target_calories || 2500;
  const targetProtein = userProfile.target_protein_g || metabolicTargets.target_protein_g || 160;
  const targetCarbs = metabolicTargets.target_carbs_g || 250;
  const targetFats = metabolicTargets.target_fats_g || 70;
  const goal = (userProfile.fitness_goal || 'hypertrophy').replace(/_/g, ' ').toUpperCase();

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <TopFadeOverlay />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>MACRO STRATEGY</Text>
          <Text style={styles.pageTitle}>Strategy</Text>
        </View>

        {/* Expenditure Card */}
        <View style={styles.expenditureCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardSubtitle}>EXPENDITURE</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>+65 kcal / week</Text>
            </View>
          </View>

          <Text style={styles.expenditureVal}>{tdee.toLocaleString()} <Text style={styles.kcalUnit}>kcal/day</Text></Text>
          <Text style={styles.expenditureDesc}>
            Calculated dynamically from your energy intake and scale weigh-in trend.
          </Text>

          {/* Mini chart placeholder line */}
          <View style={styles.chartBarRow}>
            {[35, 42, 48, 45, 52, 60, 58, 64, 62, 70, 75, 78].map((h, i) => (
              <View key={i} style={[styles.chartBar, { height: h }]} />
            ))}
          </View>
        </View>

        {/* Weekly Check-in Recommendation Card */}
        <View style={styles.checkInCard}>
          <View style={styles.checkInHeader}>
            <Text style={styles.checkInSparkle}>✨</Text>
            <Text style={styles.checkInTitle}>Weekly Companion Check-In</Text>
          </View>
          <Text style={styles.checkInBody}>
            Your expenditure averaged {tdee} kcal over the past 14 days. Your current goal is set to{' '}
            <Text style={styles.boldText}>{goal}</Text>. Macro targets are calibrated to maximize recovery.
          </Text>
          <TouchableOpacity style={styles.checkInBtn} activeOpacity={0.8}>
            <Text style={styles.checkInBtnText}>✓ Keep Targets Synchronized</Text>
          </TouchableOpacity>
        </View>

        {/* Current Macro Targets Card */}
        <View style={styles.targetsCard}>
          <Text style={styles.targetsTitle}>Program Targets</Text>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target Calories</Text>
            <Text style={styles.targetValue}>{targetCals} kcal</Text>
          </View>
          <View style={styles.targetRow}>
            <View style={styles.macroTagRow}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentOrange }]} />
              <Text style={styles.targetLabel}>Protein</Text>
            </View>
            <Text style={styles.targetValue}>{targetProtein}g</Text>
          </View>
          <View style={styles.targetRow}>
            <View style={styles.macroTagRow}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentYellow }]} />
              <Text style={styles.targetLabel}>Fats</Text>
            </View>
            <Text style={styles.targetValue}>{targetFats}g</Text>
          </View>
          <View style={styles.targetRow}>
            <View style={styles.macroTagRow}>
              <View style={[styles.macroDot, { backgroundColor: colors.accentGreen }]} />
              <Text style={styles.targetLabel}>Carbohydrates</Text>
            </View>
            <Text style={styles.targetValue}>{targetCarbs}g</Text>
          </View>
        </View>
      </ScrollView>
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
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  expenditureCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  trendBadge: {
    backgroundColor: colors.accentGreen + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentGreen,
  },
  expenditureVal: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  kcalUnit: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  expenditureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  chartBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 70,
    paddingTop: 8,
  },
  chartBar: {
    width: 14,
    backgroundColor: colors.accentBlue,
    borderRadius: 4,
    opacity: 0.8,
  },
  checkInCard: {
    backgroundColor: colors.cardHeader,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  checkInSparkle: {
    fontSize: 14,
  },
  checkInTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkInBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  checkInBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
  },
  targetsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  targetsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardHeader,
  },
  macroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  targetLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
