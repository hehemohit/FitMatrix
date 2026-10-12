import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { saveCustomBarcodeToServer } from '../../api/coachApi';
import { cacheBarcodeProduct } from '../../services/nutritionOfflineStorage';

interface BarcodeNotFoundModalProps {
  visible: boolean;
  barcode: string;
  onClose: () => void;
  onSavedAndLog: (meal: {
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }) => void;
}

export const BarcodeNotFoundModal: React.FC<BarcodeNotFoundModalProps> = ({
  visible,
  barcode,
  onClose,
  onSavedAndLog,
}) => {
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingSize, setServingSize] = useState('100g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (!productName.trim()) {
      setErrorMsg('Please enter a product name');
      return;
    }
    const cals = parseInt(calories, 10);
    const p = parseInt(protein, 10);
    if (isNaN(cals) || isNaN(p)) {
      setErrorMsg('Please enter valid numbers for calories and protein');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const c = parseInt(carbs, 10) || 0;
    const f = parseInt(fats, 10) || 0;

    const payload = {
      barcode,
      product_name: productName.trim(),
      brand: brand.trim() || 'Custom Product',
      serving_size: servingSize.trim() || '100g',
      serving_size_g: 100,
      calories: cals,
      protein_g: p,
      carbs_g: c,
      fats_g: f,
    };

    // 1. Immediately cache in local MMKV for 0ms future lookups
    cacheBarcodeProduct(barcode, {
      status: 'found',
      source: 'custom_database',
      barcode,
      product_name: payload.product_name,
      brand: payload.brand,
      serving_size: payload.serving_size,
      serving_size_g: payload.serving_size_g,
      calories: cals,
      protein_g: p,
      carbs_g: c,
      fats_g: f,
    });

    // 2. Persist to MongoDB Atlas custom_barcodes collection in background
    try {
      await saveCustomBarcodeToServer(payload);
    } catch (e) {
      console.warn('[BarcodeNotFoundModal] Server save failed (saved locally):', e);
    } finally {
      setSaving(false);
      onSavedAndLog({
        name: payload.product_name,
        calories: cals,
        protein_g: p,
        carbs_g: c,
        fats_g: f,
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <View>
                <Text style={styles.superTitle}>BARCODE 404 CROWDSOURCE</Text>
                <Text style={styles.title}>Product Not Found</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.barcodeBadge}>
              <Text style={styles.barcodeBadgeText}>🏷️ Barcode: {barcode}</Text>
            </View>

            <Text style={styles.infoText}>
              This item isn't in Open Food Facts yet. Enter its nutrition facts once and FitMatrix will remember it permanently for you and everyone!
            </Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="e.g. Protein Muesli Dark Chocolate"
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.row}>
                <View style={styles.halfCol}>
                  <Text style={styles.inputLabel}>Brand (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="e.g. Yogabar"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfCol}>
                  <Text style={styles.inputLabel}>Serving Size</Text>
                  <TextInput
                    style={styles.input}
                    value={servingSize}
                    onChangeText={setServingSize}
                    placeholder="e.g. 50g / 1 cup"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.macroGrid}>
                <View style={styles.macroInputBox}>
                  <Text style={styles.macroInputLabel}>Calories *</Text>
                  <TextInput
                    style={styles.macroInput}
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="numeric"
                    placeholder="250"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.macroInputBox}>
                  <Text style={[styles.macroInputLabel, { color: colors.accentOrange }]}>Protein (g) *</Text>
                  <TextInput
                    style={styles.macroInput}
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.macroInputBox}>
                  <Text style={[styles.macroInputLabel, { color: colors.accentGreen }]}>Carbs (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.macroInputBox}>
                  <Text style={[styles.macroInputLabel, { color: colors.accentYellow }]}>Fats (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    value={fats}
                    onChangeText={setFats}
                    keyboardType="numeric"
                    placeholder="6"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.textDark} />
                ) : (
                  <Text style={styles.saveBtnText}>Save Product & Log Meal</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '90%',
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
    marginBottom: 8,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
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
  barcodeBadge: {
    backgroundColor: colors.cardHeader,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  barcodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentYellow,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ff5252',
    fontWeight: '700',
    marginBottom: 8,
  },
  formScroll: {
    maxHeight: 400,
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
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  macroInputBox: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  macroInput: {
    backgroundColor: colors.cardHeader,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  saveBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
  },
});
