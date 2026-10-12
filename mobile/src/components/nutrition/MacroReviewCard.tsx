import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { PortionScaler } from './PortionScaler';
import type { VisionIngredientItem } from '../../api/coachApi';

interface MacroReviewCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFats: number;
  baseGrams?: number;
  confidence?: 'high' | 'medium' | 'low';
  reasoningNote?: string;
  items?: VisionIngredientItem[];
  onConfirm: (finalMeal: {
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const MacroReviewCard: React.FC<MacroReviewCardProps> = ({
  title,
  subtitle,
  imageUrl,
  baseCalories,
  baseProtein,
  baseCarbs,
  baseFats,
  baseGrams = 100,
  confidence = 'high',
  reasoningNote,
  items,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [customGrams, setCustomGrams] = useState<number>(baseGrams);

  const handleSelectMultiplier = (m: number) => {
    setMultiplier(m);
    setCustomGrams(Math.round(baseGrams * m));
  };

  const handleAdjustGrams = (delta: number) => {
    const nextGrams = Math.max(10, customGrams + delta);
    setCustomGrams(nextGrams);
    setMultiplier(nextGrams / (baseGrams || 100));
  };

  const scaledCalories = Math.round(baseCalories * multiplier);
  const scaledProtein = Math.round(baseProtein * multiplier);
  const scaledCarbs = Math.round(baseCarbs * multiplier);
  const scaledFats = Math.round(baseFats * multiplier);

  const isLowOrMediumConfidence = confidence === 'low' || confidence === 'medium';

  return (
    <View style={[styles.card, isLowOrMediumConfidence && styles.cardAmberBorder]}>
      {/* Header with Title and Thumbnail */}
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={styles.foodTitle} numberOfLines={2}>
            {title}
          </Text>
          {subtitle && <Text style={styles.foodSubtitle}>{subtitle}</Text>}
        </View>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
        )}
      </View>

      {/* Amber Warning Banner for AI Portion Hallucination Risk */}
      {isLowOrMediumConfidence && (
        <View style={styles.amberAlertBanner}>
          <Text style={styles.amberIcon}>⚠️</Text>
          <View style={styles.amberTextCol}>
            <Text style={styles.amberAlertTitle}>
              AI Portion Estimate ({confidence.toUpperCase()} CONFIDENCE)
            </Text>
            <Text style={styles.amberAlertBody}>
              {reasoningNote || 'Portion calibrated against a standard dinner plate. Please verify grams before logging.'}
            </Text>
          </View>
        </View>
      )}

      {/* Portion Scaler */}
      <PortionScaler
        multiplier={multiplier}
        baseGrams={baseGrams}
        currentGrams={customGrams}
        onSelectMultiplier={handleSelectMultiplier}
        onAdjustGrams={handleAdjustGrams}
      />

      {/* Macro Breakdown Tags */}
      <View style={styles.macroMetricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>CALORIES</Text>
          <Text style={styles.metricVal}>{scaledCalories} <Text style={styles.unitText}>kcal</Text></Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.macroLabelWithDot}>
            <View style={[styles.macroDot, { backgroundColor: colors.accentOrange }]} />
            <Text style={styles.metricLabel}>PROTEIN</Text>
          </View>
          <Text style={styles.metricVal}>{scaledProtein} <Text style={styles.unitText}>g</Text></Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.macroLabelWithDot}>
            <View style={[styles.macroDot, { backgroundColor: colors.accentGreen }]} />
            <Text style={styles.metricLabel}>CARBS</Text>
          </View>
          <Text style={styles.metricVal}>{scaledCarbs} <Text style={styles.unitText}>g</Text></Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.macroLabelWithDot}>
            <View style={[styles.macroDot, { backgroundColor: colors.accentYellow }]} />
            <Text style={styles.metricLabel}>FATS</Text>
          </View>
          <Text style={styles.metricVal}>{scaledFats} <Text style={styles.unitText}>g</Text></Text>
        </View>
      </View>

      {/* Itemized Constituents (for AI Vision scans) */}
      {items && items.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>DETECTED INGREDIENTS</Text>
          {items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.name} ({it.portion_g}g)</Text>
              <Text style={styles.itemMacros}>
                {it.calories} kcal • {it.protein_g}P • {it.carbs_g}C • {it.fats_g}F
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => onConfirm({
            name: title,
            calories: scaledCalories,
            protein_g: scaledProtein,
            carbs_g: scaledCarbs,
            fats_g: scaledFats,
          })}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textDark} />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm & Log Meal</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 16,
  },
  cardAmberBorder: {
    borderColor: 'rgba(255, 179, 0, 0.45)',
    backgroundColor: '#1f1b13',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleCol: {
    flex: 1,
    paddingRight: 10,
  },
  foodTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  foodSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.cardHeader,
  },
  placeholderThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.cardHeader,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  amberAlertBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 179, 0, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.35)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  amberIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  amberTextCol: {
    flex: 1,
  },
  amberAlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffc107',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amberAlertBody: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  macroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.cardHeader,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  metricBox: {
    alignItems: 'flex-start',
  },
  macroLabelWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  unitText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  itemsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
    marginBottom: 14,
    gap: 6,
  },
  itemsSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemMacros: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.cardHeader,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
});
