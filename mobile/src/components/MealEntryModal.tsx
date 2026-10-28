/**
 * MealEntryModal.tsx — FitMatrix Unified Nutrition Logging Center
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete nutrition logging interface featuring:
 *  • ⭐ Smart Frequent Foods Shelf (1-tap re-log of top 5 staples)
 *  • ✍️ Free-text AI macro estimation (Gemini)
 *  • 📸 Multimodal Food Photo Analysis (Gemini Vision with Amber Alert Hallucination safeguard)
 *  • 🏷️ Barcode Scanner & Lookup (Offline MMKV cache + Open Food Facts + 404 crowdsourcing)
 *  • Interactive Portion Scaler (0.5x, 1x, 1.5x, 2x, custom grams)
 *  • Optimistic UI updating local MMKV + MongoDB Atlas background sync
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Animated,
  Image,
  PermissionsAndroid,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { colors } from '../theme/colors';
import {
  estimateMealMacros,
  fetchBarcodeNutrition,
  estimateVisionMealMacros,
  MealImageUpload,
  BarcodeProduct,
  VisionEstimateResponse,
} from '../api/coachApi';
import type { MealItem } from '../api/coachApi';
import { AnimatedSegmentedControl, SegmentOption } from './strategy/AnimatedSegmentedControl';
import { FrequentFoodsShelf } from './macrofactor/FrequentFoodsShelf';
import { FrequentFoodItem, getCachedBarcodeProduct, cacheBarcodeProduct } from '../services/nutritionOfflineStorage';
import { MacroReviewCard } from './nutrition/MacroReviewCard';
import { BarcodeNotFoundModal } from './nutrition/BarcodeNotFoundModal';

// ─── Constants ────────────────────────────────────────────────────────────────

type LogMode = 'describe' | 'vision' | 'barcode';

const LOG_MODES: SegmentOption<LogMode>[] = [
  { key: 'describe', label: '✍️ Text AI' },
  { key: 'vision', label: '📸 Food Photo' },
  { key: 'barcode', label: '🏷️ Barcode' },
];

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

const CATEGORY_ICONS: Record<string, string> = {
  Breakfast: '🌅',
  Lunch: '☀️',
  Dinner: '🌙',
  Snack: '🍎',
  'Pre-Workout': '⚡',
  'Post-Workout': '💪',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MealEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onLog: (meal: MealItem) => Promise<void>;
  initialCategory?: string;
  initialDescription?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MealEntryModal: React.FC<MealEntryModalProps> = ({
  visible,
  onClose,
  onLog,
  initialCategory,
  initialDescription,
}) => {
  const [activeMode, setActiveMode] = useState<LogMode>('describe');

  // ── Mode 1: Text Describe State ─────────────────────────────────────────────
  const [description, setDescription] = useState(initialDescription || '');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(initialCategory || 'Lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [logging, setLogging] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  const [step, setStep] = useState<'describe' | 'confirm'>('describe');

  React.useEffect(() => {
    if (visible) {
      if (initialCategory) setCategory(initialCategory);
      if (initialDescription) {
        setDescription(initialDescription);
      }
    }
  }, [visible, initialCategory, initialDescription]);

  // ── Mode 2: Vision Photo State ──────────────────────────────────────────────
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageAsset, setSelectedImageAsset] = useState<MealImageUpload | null>(null);
  const [mealHint, setMealHint] = useState('');
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionStage, setVisionStage] = useState('');
  const [visionError, setVisionError] = useState('');
  const [visionReview, setVisionReview] = useState<VisionEstimateResponse | null>(null);

  // ── Mode 3: Barcode State ───────────────────────────────────────────────────
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');
  const [barcodeReview, setBarcodeReview] = useState<BarcodeProduct | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setDescription('');
    setName('');
    setCategory('Lunch');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setEstimating(false);
    setLogging(false);
    setEstimateError('');
    setStep('describe');

    setSelectedImageUri(null);
    setSelectedImageAsset(null);
    setMealHint('');
    setVisionLoading(false);
    setVisionStage('');
    setVisionError('');
    setVisionReview(null);

    setBarcodeInput('');
    setBarcodeLoading(false);
    setBarcodeError('');
    setBarcodeReview(null);
    setNotFoundBarcode(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const getCurrentTimeString = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // ── 1-Tap Log from Smart Frequent Foods Shelf ────────────────────────────────
  const handleLogFrequentFood = async (item: FrequentFoodItem) => {
    const meal: MealItem = {
      name: item.name,
      category: item.category || 'Lunch',
      time: getCurrentTimeString(),
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fats_g: item.fats_g,
    };
    setLogging(true);
    try {
      await onLog(meal);
      handleClose();
    } finally {
      setLogging(false);
    }
  };

  // ── Mode 1: AI Free-Text Estimate ────────────────────────────────────────────
  const handleEstimate = useCallback(async () => {
    if (!description.trim()) {
      shake();
      setEstimateError('Describe the meal first — be specific for accurate estimates.');
      return;
    }
    Keyboard.dismiss();
    setEstimating(true);
    setEstimateError('');
    try {
      const est = await estimateMealMacros(description.trim());
      setName(est.name ?? description.trim());
      setCalories(String(est.calories ?? 0));
      setProtein(String(est.protein_g ?? 0));
      setCarbs(String(est.carbs_g ?? 0));
      setFats(String(est.fats_g ?? 0));
      setIsCached(Boolean(est.cached));
      setStep('confirm');
    } catch {
      setEstimateError('Could not estimate — check connection or enter manually.');
    } finally {
      setEstimating(false);
    }
  }, [description, shake]);

  const handleLogManualOrDescribe = useCallback(async () => {
    const cal = parseInt(calories, 10);
    const pro = parseInt(protein, 10);
    if (!name.trim() || isNaN(cal) || isNaN(pro)) {
      shake();
      return;
    }

    const meal: MealItem = {
      name: name.trim(),
      category,
      time: getCurrentTimeString(),
      calories: cal,
      protein_g: pro,
      carbs_g: parseInt(carbs, 10) || 0,
      fats_g: parseInt(fats, 10) || 0,
    };

    setLogging(true);
    try {
      await onLog(meal);
      handleClose();
    } finally {
      setLogging(false);
    }
  }, [name, category, calories, protein, carbs, fats, onLog, handleClose, shake]);

  // ── Mode 2: Multimodal Photo AI Vision ───────────────────────────────────────
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (alreadyGranted) {
        return true;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Access Needed',
          message: 'FitMatrix needs camera access so you can take food photos and estimate macros.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Camera Permission Blocked',
          'Camera access was previously denied or not enabled. Please enable camera permission in App Settings or choose a photo from your gallery.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    } catch (err) {
      console.warn('[requestCameraPermission] Error:', err);
      return false;
    }
  };

  const handlePickPhoto = async (type: 'camera' | 'library') => {
    setVisionError('');

    if (type === 'camera') {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setVisionError('Camera permission is required. If the camera option is missing in settings, rebuild the app with "npm run android".');
        return;
      }
    }

    try {
      const options = {
        mediaType: 'photo' as const,
        includeBase64: false, // Stream direct from disk to avoid high JS memory usage
        quality: 0.7 as const, // Optimal compression for Gemini vision single-tile
        maxWidth: 768,          // Gemini vision tile dimension
        maxHeight: 768,
      };

      const result = type === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        if (result.errorCode === 'permission') {
          setVisionError('Camera permission not granted by device. Tap below to open Settings, or rebuild the app with "npm run android".');
          Alert.alert(
            'Camera Permission Required',
            'To take photos directly in FitMatrix, camera permission must be granted. If you just installed the camera feature, rebuild the app with "npm run android".',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          setVisionError(result.errorMessage || 'Failed to capture photo.');
        }
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setSelectedImageUri(asset.uri);
          setSelectedImageAsset({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            fileName: asset.fileName || 'meal.jpg',
          });
        }
      }
    } catch (err: any) {
      console.warn('[handlePickPhoto] Error picking photo:', err);
      setVisionError('Could not launch camera. Please re-run "npm run android" to compile the new camera permissions into your APK.');
    }
  };

  const handleAnalyzeVisionPhoto = async () => {
    if (!selectedImageAsset || !selectedImageUri) {
      shake();
      setVisionError('Please snap a photo or choose an image first.');
      return;
    }
    setVisionLoading(true);
    setVisionStage('Optimizing & uploading image...');
    setVisionError('');
    Keyboard.dismiss();

    const timer1 = setTimeout(() => {
      setVisionStage('Decomposing ingredients with Gemini...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setVisionStage('Calculating macros & plate scale...');
    }, 2800);

    try {
      const res = await estimateVisionMealMacros(selectedImageAsset, mealHint.trim() || undefined);
      setVisionReview(res);
    } catch (err: any) {
      console.warn('[handleAnalyzeVisionPhoto] Vision error:', err);
      setVisionError('AI Vision analysis failed. Please check internet connection or enter manually.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setVisionLoading(false);
      setVisionStage('');
    }
  };

  const handleConfirmVisionMeal = async (finalMeal: {
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }) => {
    const meal: MealItem = {
      name: finalMeal.name,
      category,
      time: getCurrentTimeString(),
      calories: finalMeal.calories,
      protein_g: finalMeal.protein_g,
      carbs_g: finalMeal.carbs_g,
      fats_g: finalMeal.fats_g,
    };
    setLogging(true);
    try {
      await onLog(meal);
      handleClose();
    } finally {
      setLogging(false);
    }
  };

  // ── Mode 3: Barcode Lookup ──────────────────────────────────────────────────
  const handleLookupBarcode = async (codeToLookup?: string) => {
    const code = (codeToLookup || barcodeInput).trim();
    if (!code) {
      shake();
      setBarcodeError('Please enter or scan a barcode.');
      return;
    }

    setBarcodeLoading(true);
    setBarcodeError('');
    Keyboard.dismiss();

    // 1. Check local MMKV cache first (0ms latency)
    const cached = getCachedBarcodeProduct(code);
    if (cached && cached.status === 'found') {
      setBarcodeReview(cached);
      setBarcodeLoading(false);
      return;
    }

    // 2. Query backend proxy (Open Food Facts + custom Atlas database)
    try {
      const res = await fetchBarcodeNutrition(code);
      if (res.status === 'found') {
        cacheBarcodeProduct(code, res);
        setBarcodeReview(res);
      } else {
        // 404 crowdsourced flow
        setNotFoundBarcode(code);
      }
    } catch (err) {
      console.warn('[handleLookupBarcode] Error looking up barcode:', err);
      // Fallback to custom entry on network failure or 404
      setNotFoundBarcode(code);
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleConfirmBarcodeMeal = async (finalMeal: {
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }) => {
    const meal: MealItem = {
      name: finalMeal.name,
      category,
      time: getCurrentTimeString(),
      calories: finalMeal.calories,
      protein_g: finalMeal.protein_g,
      carbs_g: finalMeal.carbs_g,
      fats_g: finalMeal.fats_g,
    };
    setLogging(true);
    try {
      await onLog(meal);
      handleClose();
    } finally {
      setLogging(false);
    }
  };

  // ── Render Mode Contents ────────────────────────────────────────────────────

  const renderDescribeContent = () => {
    if (step === 'confirm') {
      return (
        <View style={styles.confirmContainer}>
          <Text style={styles.stepLabel}>Step 2 — Confirm & Log</Text>

          <TextInput
            style={styles.input}
            placeholder="Meal name"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {CATEGORY_ICONS[cat]} {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.macroGrid}>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>CALORIES</Text>
              <TextInput style={styles.macroInput} keyboardType="numeric" value={calories} onChangeText={setCalories} placeholder="0" placeholderTextColor="#888" />
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: colors.accentOrange }]}>PROTEIN (g)</Text>
              <TextInput style={styles.macroInput} keyboardType="numeric" value={protein} onChangeText={setProtein} placeholder="0" placeholderTextColor="#888" />
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: colors.accentGreen }]}>CARBS (g)</Text>
              <TextInput style={styles.macroInput} keyboardType="numeric" value={carbs} onChangeText={setCarbs} placeholder="0" placeholderTextColor="#888" />
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: colors.accentYellow }]}>FATS (g)</Text>
              <TextInput style={styles.macroInput} keyboardType="numeric" value={fats} onChangeText={setFats} placeholder="0" placeholderTextColor="#888" />
            </View>
          </View>

          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleLogManualOrDescribe} disabled={logging}>
            {logging ? <ActivityIndicator color={colors.textDark} /> : <Text style={styles.btnPrimaryText}>Log Meal</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.stepLabel}>Describe what you ate</Text>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TextInput
            style={[styles.input, styles.multiLine]}
            placeholder="e.g. 2 boiled eggs, 1 brown bread with peanut butter and a banana"
            placeholderTextColor="#888"
            value={description}
            onChangeText={t => { setDescription(t); setEstimateError(''); }}
            multiline
            numberOfLines={3}
          />
        </Animated.View>

        {estimateError ? <Text style={styles.errorText}>{estimateError}</Text> : null}

        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleEstimate} disabled={estimating}>
          {estimating ? <ActivityIndicator color={colors.textDark} /> : <Text style={styles.btnPrimaryText}>✨ Estimate with AI</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setStep('confirm')}>
          <Text style={styles.btnSecondaryText}>Enter manually</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderVisionContent = () => {
    if (visionReview) {
      return (
        <MacroReviewCard
          title={visionReview.dish_name}
          subtitle={`AI Multimodal Scan • ${category}`}
          imageUrl={selectedImageUri || undefined}
          baseCalories={visionReview.total_calories}
          baseProtein={visionReview.total_protein_g}
          baseCarbs={visionReview.total_carbs_g}
          baseFats={visionReview.total_fats_g}
          confidence={visionReview.confidence}
          reasoningNote={visionReview.reasoning_note}
          items={visionReview.items}
          onConfirm={handleConfirmVisionMeal}
          onCancel={() => setVisionReview(null)}
          loading={logging}
        />
      );
    }

    return (
      <View>
        <Text style={styles.stepLabel}>Capture Meal Photo</Text>

        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickPhoto('camera')} activeOpacity={0.8}>
            <Text style={styles.photoActionEmoji}>📷</Text>
            <Text style={styles.photoActionTitle}>Snap Photo</Text>
            <Text style={styles.photoActionSub}>Use Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickPhoto('library')} activeOpacity={0.8}>
            <Text style={styles.photoActionEmoji}>🖼️</Text>
            <Text style={styles.photoActionTitle}>Choose Photo</Text>
            <Text style={styles.photoActionSub}>From Gallery</Text>
          </TouchableOpacity>
        </View>

        {selectedImageUri && (
          <View style={styles.previewBox}>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImg} />
            <TouchableOpacity style={styles.clearImgBtn} onPress={() => { setSelectedImageUri(null); setSelectedImageAsset(null); }}>
              <Text style={styles.clearImgText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.inputLabel}>Meal context (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Lunch at Chipotle, extra black beans"
          placeholderTextColor="#888"
          value={mealHint}
          onChangeText={setMealHint}
        />

        {visionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{visionError}</Text>
            {visionError.toLowerCase().includes('permission') && (
              <TouchableOpacity
                style={styles.openSettingsBtn}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.8}
              >
                <Text style={styles.openSettingsBtnText}>⚙️ Open App Settings to Allow Camera</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, (!selectedImageAsset || visionLoading) && styles.btnDisabled]}
          onPress={handleAnalyzeVisionPhoto}
          disabled={!selectedImageAsset || visionLoading}
        >
          {visionLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textDark} style={styles.loadingSpinner} />
              <Text style={styles.loadingStageText}>
                {visionStage || 'Analyzing with Gemini...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.btnPrimaryText}>✨ Analyze with Gemini Vision</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderBarcodeContent = () => {
    if (barcodeReview) {
      return (
        <MacroReviewCard
          title={barcodeReview.product_name || 'Packaged Product'}
          subtitle={`${barcodeReview.brand || ''} • ${barcodeReview.serving_size || '100g'}`}
          imageUrl={barcodeReview.image_url}
          baseCalories={barcodeReview.calories || 0}
          baseProtein={barcodeReview.protein_g || 0}
          baseCarbs={barcodeReview.carbs_g || 0}
          baseFats={barcodeReview.fats_g || 0}
          baseGrams={barcodeReview.serving_size_g || 100}
          confidence="high"
          onConfirm={handleConfirmBarcodeMeal}
          onCancel={() => setBarcodeReview(null)}
          loading={logging}
        />
      );
    }

    return (
      <View>
        <Text style={styles.stepLabel}>Barcode Nutrition Lookup</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter or paste barcode (e.g. 3017620422003)"
          placeholderTextColor="#888"
          value={barcodeInput}
          onChangeText={t => { setBarcodeInput(t); setBarcodeError(''); }}
          keyboardType="numeric"
        />

        {/* Quick sample barcode shortcuts for testing */}
        <View style={styles.sampleBarcodesRow}>
          <Text style={styles.sampleBarcodeLabel}>Quick test:</Text>
          <TouchableOpacity onPress={() => { setBarcodeInput('3017620422003'); handleLookupBarcode('3017620422003'); }} style={styles.sampleTag}>
            <Text style={styles.sampleTagText}>Nutella</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setBarcodeInput('8901030865421'); handleLookupBarcode('8901030865421'); }} style={styles.sampleTag}>
            <Text style={styles.sampleTagText}>Greek Yogurt</Text>
          </TouchableOpacity>
        </View>

        {barcodeError ? <Text style={styles.errorText}>{barcodeError}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, barcodeLoading && styles.btnDisabled]}
          onPress={() => handleLookupBarcode()}
          disabled={barcodeLoading}
        >
          {barcodeLoading ? (
            <ActivityIndicator color={colors.textDark} />
          ) : (
            <Text style={styles.btnPrimaryText}>🔍 Lookup Barcode</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.superTitle}>NUTRITION LOGGING</Text>
              <Text style={styles.title}>Log Food & Macros</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Smart Frequent Foods Shelf (1-Tap Re-log) */}
            <FrequentFoodsShelf onSelectFood={handleLogFrequentFood} />

            {/* 2. 3-Mode Hardware-Accelerated Sliding Pill Segmented Selector */}
            <AnimatedSegmentedControl
              options={LOG_MODES}
              selectedKey={activeMode}
              onSelect={mode => {
                setActiveMode(mode);
                setVisionReview(null);
                setBarcodeReview(null);
              }}
              style={{ marginBottom: 16 }}
            />

            {/* 3. Active Mode Body */}
            {activeMode === 'describe' && renderDescribeContent()}
            {activeMode === 'vision' && renderVisionContent()}
            {activeMode === 'barcode' && renderBarcodeContent()}
          </ScrollView>
        </View>
      </View>

      {/* Barcode 404 Crowdsourced Community Modal */}
      {notFoundBarcode && (
        <BarcodeNotFoundModal
          visible={!!notFoundBarcode}
          barcode={notFoundBarcode}
          onClose={() => setNotFoundBarcode(null)}
          onSavedAndLog={handleConfirmBarcodeMeal}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.cardHeader,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  multiLine: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff5252',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: -4,
  },
  errorBox: {
    marginBottom: 10,
    marginTop: -4,
  },
  openSettingsBtn: {
    backgroundColor: colors.cardHeader,
    borderWidth: 1,
    borderColor: colors.accentYellow,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  openSettingsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentYellow,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimary: {
    backgroundColor: colors.textPrimary,
  },
  btnSecondary: {
    backgroundColor: colors.cardHeader,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    color: colors.textDark,
    fontWeight: '800',
    fontSize: 15,
  },
  btnSecondaryText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmContainer: {
    marginTop: 4,
  },
  categoryScroll: {
    marginBottom: 14,
  },
  categoryChip: {
    backgroundColor: colors.cardHeader,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryChipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.textDark,
    fontWeight: '800',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  macroCol: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  macroInput: {
    backgroundColor: colors.cardHeader,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: colors.cardHeader,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  photoActionEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  photoActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  photoActionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewBox: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  previewImg: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardHeader,
  },
  clearImgBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#00000099',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearImgText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  sampleBarcodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sampleBarcodeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sampleTag: {
    backgroundColor: colors.cardHeader,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sampleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentBlue,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: 8,
  },
  loadingStageText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
  },
});
