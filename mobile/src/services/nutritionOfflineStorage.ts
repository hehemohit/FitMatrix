import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { BarcodeProduct, MealItem } from '../api/coachApi';

const offlineStorage: MMKV = createMMKV({ id: 'fitmatrix-nutrition-cache' });

export interface FrequentFoodItem {
  name: string;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  count: number;
  lastLogged: string;
}

export interface PendingVisionSnap {
  id: string;
  imageUri: string;
  imageBase64?: string;
  fileName?: string;
  type?: string;
  mealHint?: string;
  category?: string;
  timestamp: string;
}

const BARCODE_CACHE_PREFIX = 'barcode_';
const FREQUENT_FOODS_KEY = 'frequent_foods_v1';
const PENDING_SNAPS_KEY = 'pending_vision_snaps_v1';

// ─── 1. Barcode Caching (Offline-First) ────────────────────────────────────────

export function getCachedBarcodeProduct(barcode: string): BarcodeProduct | null {
  try {
    const raw = offlineStorage.getString(`${BARCODE_CACHE_PREFIX}${barcode}`);
    if (raw) {
      return JSON.parse(raw) as BarcodeProduct;
    }
  } catch (err) {
    console.warn('[getCachedBarcodeProduct] Error reading cache:', err);
  }
  return null;
}

export function cacheBarcodeProduct(barcode: string, product: BarcodeProduct): void {
  try {
    offlineStorage.set(`${BARCODE_CACHE_PREFIX}${barcode}`, JSON.stringify(product));
  } catch (err) {
    console.warn('[cacheBarcodeProduct] Error writing cache:', err);
  }
}

// ─── 2. Smart Frequent Foods (Top 5 Staples) ─────────────────────────────────

export function getFrequentFoods(): FrequentFoodItem[] {
  try {
    const raw = offlineStorage.getString(FREQUENT_FOODS_KEY);
    if (raw) {
      const items = JSON.parse(raw) as FrequentFoodItem[];
      return items.sort((a, b) => b.count - a.count).slice(0, 5);
    }
  } catch (err) {
    console.warn('[getFrequentFoods] Error reading frequent foods:', err);
  }

  // Sensible defaults if user is new
  return [
    { name: 'Whey Protein Shake', category: 'Post-Workout', calories: 130, protein_g: 25, carbs_g: 3, fats_g: 2, count: 5, lastLogged: new Date().toISOString() },
    { name: '3 Scrambled Eggs & Toast', category: 'Breakfast', calories: 350, protein_g: 21, carbs_g: 26, fats_g: 17, count: 4, lastLogged: new Date().toISOString() },
    { name: 'Grilled Chicken & Rice', category: 'Lunch', calories: 480, protein_g: 45, carbs_g: 50, fats_g: 8, count: 3, lastLogged: new Date().toISOString() },
  ];
}

export function recordLoggedFood(meal: MealItem): void {
  try {
    const raw = offlineStorage.getString(FREQUENT_FOODS_KEY);
    let items: FrequentFoodItem[] = raw ? JSON.parse(raw) : [];

    const normName = meal.name.trim().toLowerCase();
    const existingIndex = items.findIndex(it => it.name.trim().toLowerCase() === normName);

    if (existingIndex >= 0) {
      items[existingIndex].count += 1;
      items[existingIndex].lastLogged = new Date().toISOString();
      items[existingIndex].calories = meal.calories;
      items[existingIndex].protein_g = meal.protein_g;
      items[existingIndex].carbs_g = meal.carbs_g;
      items[existingIndex].fats_g = meal.fats_g;
      items[existingIndex].category = meal.category || items[existingIndex].category;
    } else {
      items.push({
        name: meal.name.trim(),
        category: meal.category || 'Lunch',
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fats_g: meal.fats_g,
        count: 1,
        lastLogged: new Date().toISOString(),
      });
    }

    // Keep top 30 items
    items = items.sort((a, b) => b.count - a.count).slice(0, 30);
    offlineStorage.set(FREQUENT_FOODS_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[recordLoggedFood] Error updating frequent foods:', err);
  }
}

// ─── 3. Offline Pending Vision Snaps Queue ────────────────────────────────────

export function getPendingVisionSnaps(): PendingVisionSnap[] {
  try {
    const raw = offlineStorage.getString(PENDING_SNAPS_KEY);
    if (raw) {
      return JSON.parse(raw) as PendingVisionSnap[];
    }
  } catch (err) {
    console.warn('[getPendingVisionSnaps] Error reading queue:', err);
  }
  return [];
}

export function queuePendingVisionSnap(snap: PendingVisionSnap): void {
  try {
    const queue = getPendingVisionSnaps();
    queue.push(snap);
    offlineStorage.set(PENDING_SNAPS_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[queuePendingVisionSnap] Error saving pending snap:', err);
  }
}

export function removePendingVisionSnap(id: string): void {
  try {
    const queue = getPendingVisionSnaps().filter(s => s.id !== id);
    offlineStorage.set(PENDING_SNAPS_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[removePendingVisionSnap] Error removing pending snap:', err);
  }
}
