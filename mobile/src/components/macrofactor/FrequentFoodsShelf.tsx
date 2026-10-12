import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { getFrequentFoods, FrequentFoodItem } from '../../services/nutritionOfflineStorage';

interface FrequentFoodsShelfProps {
  onSelectFood: (food: FrequentFoodItem) => void;
}

export const FrequentFoodsShelf: React.FC<FrequentFoodsShelfProps> = ({ onSelectFood }) => {
  const [frequentItems, setFrequentItems] = useState<FrequentFoodItem[]>([]);

  useEffect(() => {
    const items = getFrequentFoods();
    setFrequentItems(items);
  }, []);

  if (frequentItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>⭐ FREQUENT STAPLES (1-TAP RE-LOG)</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {frequentItems.map((item, idx) => (
          <TouchableOpacity
            key={`${item.name}-${idx}`}
            style={styles.foodChip}
            onPress={() => onSelectFood(item)}
            activeOpacity={0.75}
          >
            <View style={styles.chipTop}>
              <Text style={styles.foodName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.addBadge}>
                <Text style={styles.addPlus}>+</Text>
              </View>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.calsText}>{item.calories} kcal</Text>
              <Text style={styles.macroDivider}>•</Text>
              <Text style={styles.proteinText}>{item.protein_g}g P</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  scrollList: {
    paddingRight: 12,
    gap: 8,
  },
  foodChip: {
    backgroundColor: colors.cardHeader,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minWidth: 130,
    maxWidth: 180,
  },
  chipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  foodName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  addBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentGreen + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.accentGreen,
    lineHeight: 13,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calsText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  macroDivider: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  proteinText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentOrange,
  },
});
