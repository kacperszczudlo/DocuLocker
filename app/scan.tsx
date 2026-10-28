import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '@/database/connection';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { StoreRepository } from '@/database/repositories/storeRepository';
import { FileStorageService } from '@/services/storage/fileStorageService';
import { MlKitOcrEngine } from '@/services/ocr/ocrEngine';
import { ScanReceiptUseCase } from '@/core/useCases/scanReceiptUseCase';
import { SaveDocumentUseCase } from '@/core/useCases/saveDocumentUseCase';
import { NotificationService } from '@/services/notifications/notificationService';
import { CategoryRow } from '@/database/types';
import { colors, spacing, radii, typography, touchTargets, iconSizes, shadows, CATEGORY_ICON_MAP } from '@/theme/tokens';
import { BrandLogo } from '@/components/BrandLogo';
import { CameraDisclosureModal } from '@/components/CameraDisclosureModal';

const WARRANTY_OPTIONS = [
  { label: 'Brak', months: 0, icon: 'close-circle-outline' },
  { label: '12 m-cy', months: 12, icon: 'time-outline' },
  { label: '24 m-ce (Standard)', months: 24, icon: 'shield-checkmark-outline' },
  { label: '36 m-cy', months: 36, icon: 'shield-checkmark' },
  { label: '60 m-cy (5 lat)', months: 60, icon: 'ribbon-outline' },
];

/**
 * ScanScreen - Ekran akwizycji i weryfikacji paragonu.
 *
 * Zaprojektowany zgodnie z Google Material Design 3 i Apple HIG 2025:
 * - Wektorowe ikony dla każdej akcji i pola wejściowego
 * - Minimalny touch target 48dp na kontrolkę
 * - Czytelne wskaźniki inferencji ML Kit Edge AI
 */
export default function ScanScreen() {
  const router = useRouter();

  // State
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCameraDisclosure, setShowCameraDisclosure] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [ocrRawText, setOcrRawText] = useState<string | null>(null);
  const [ocrProcessingTime, setOcrProcessingTime] = useState<number | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [storeName, setStoreName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [warrantyMonths, setWarrantyMonths] = useState(24);
  const [returnDays, setReturnDays] = useState('14');
  const [notes, setNotes] = useState('');

  // Confidence indicators from OCR
  const [detectedConfidence, setDetectedConfidence] = useState<{
    hasAmount: boolean;
    hasDate: boolean;
    hasStore: boolean;
  }>({ hasAmount: false, hasDate: false, hasStore: false });

  useEffect(() => {
    async function loadCategories() {
      try {
        const db = await getDatabase();
        const catRepo = new CategoryRepository(db);
        const list = await catRepo.listCategories();
        setCategories(list);
      } catch (err) {
        console.error('Błąd ładowania kategorii:', err);
      }
    }
    loadCategories();
  }, []);

  const launchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setImageUri(selectedUri);
        await processReceiptImage(selectedUri);
      }
    } catch (err) {
      console.error('[DocuLocker] Błąd aparatu:', err);
      Alert.alert('Błąd', 'Nie udało się wykonać zdjęcia aparatem.');
    }
  };

  const handleCameraDisclosureAccept = async () => {
    setShowCameraDisclosure(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Aplikacja potrzebuje dostępu do aparatu.');
        return;
      }
      await launchCamera();
    } catch (err) {
      console.error('[DocuLocker] Błąd podczas pytania o uprawnienia aparatu:', err);
      Alert.alert('Błąd', 'Wystąpił problem z aparatem.');
    }
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.getCameraPermissionsAsync();
        if (!permission.granted) {
          setShowCameraDisclosure(true);
          return;
        }
        await launchCamera();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Brak uprawnień', 'Aplikacja potrzebuje dostępu do galerii.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedUri = result.assets[0].uri;
          setImageUri(selectedUri);
          await processReceiptImage(selectedUri);
        }
      }
    } catch (err) {
      console.error('[DocuLocker] Błąd wyboru zdjęcia:', err);
      Alert.alert('Błąd', 'Nie udało się pobrać zdjęcia.');
    }
  };

  const processReceiptImage = async (uri: string) => {
    setIsProcessingOcr(true);
    const startTime = Date.now();
    try {
      const ocrEngine = new MlKitOcrEngine();
      const scanUseCase = new ScanReceiptUseCase(ocrEngine);
      const parsed = await scanUseCase.execute(uri);

      setOcrProcessingTime(Date.now() - startTime);
      setOcrRawText(parsed.rawText);

      if (parsed.suggestedTitle) {
        setTitle(parsed.suggestedTitle);
      }
      if (parsed.storeName) {
        setStoreName(parsed.storeName);
      }
      if (parsed.detectedTaxId) {
        setTaxId(parsed.detectedTaxId);
      }
      if (parsed.totalAmount) {
        setTotalAmount(parsed.totalAmount.amount.toFixed(2));
        setCurrency(parsed.totalAmount.currency);
      }
      if (parsed.purchaseDate) {
        setPurchaseDate(parsed.purchaseDate.isoDate);
      }
      if (parsed.suggestedCategoryName) {
        const match = categories.find(
          (cat) => cat.name.toLowerCase() === parsed.suggestedCategoryName!.toLowerCase()
        );
        setSelectedCategoryId(match?.id ?? null);
      } else {
        setSelectedCategoryId(null);
      }
      if (parsed.suggestedReturnDays != null) {
        setReturnDays(String(parsed.suggestedReturnDays));
      } else if (parsed.storeName) {
        try {
          const db = await getDatabase();
          const store = await new StoreRepository(db).findByName(parsed.storeName);
          if (store?.default_return_days != null) {
            setReturnDays(String(store.default_return_days));
          }
        } catch {
          // domyślne 14
        }
      }

      setDetectedConfidence({
        hasAmount: !!parsed.totalAmount,
        hasDate: !!parsed.purchaseDate,
        hasStore: !!parsed.storeName,
      });
    } catch (err) {
      console.error('[DocuLocker] Błąd inferencji OCR:', err);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Wymagane pole', 'Wprowadź tytuł dokumentu.');
      return;
    }

    const parsedAmount = parseFloat(totalAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Niepoprawna kwota', 'Wprowadź poprawną kwotę transakcji.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
      Alert.alert('Niepoprawna data', 'Wprowadź datę w formacie RRRR-MM-DD.');
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDatabase();
      const docRepo = new DocumentRepository(db);
      const storeRepo = new StoreRepository(db);
      const storageService = new FileStorageService();
      const notifService = new NotificationService();
      const saveUseCase = new SaveDocumentUseCase(docRepo, storeRepo, storageService, notifService);

      await saveUseCase.execute({
        title: trimmedTitle,
        storeName: storeName.trim() || null,
        taxId: taxId.trim() || null,
        categoryId: selectedCategoryId,
        totalAmount: parsedAmount,
        currency: currency.trim() || 'PLN',
        purchaseDate,
        documentType: 'RECEIPT',
        warrantyMonths,
        returnWindowDays: parseInt(returnDays, 10) || 14,
        notes: notes.trim() || null,
        rawOcrText: ocrRawText,
        tempImageUri: imageUri,
      });

      router.back();
    } catch (err) {
      console.error('Błąd zapisu paragonu:', err);
      Alert.alert('Błąd zapisu', 'Nie udało się zapisać paragonu w bazie SQLite.');
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryMeta = (catName?: string) => {
    if (!catName || !CATEGORY_ICON_MAP[catName]) {
      return {
        icon: 'receipt-outline',
        color: colors.primaryLight,
        bg: colors.primarySubtle,
      };
    }
    return CATEGORY_ICON_MAP[catName];
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sekcja dodawania zdjęcia */}
        {!imageUri ? (
          <View style={styles.captureCard}>
            <BrandLogo size={64} variant="lock" showBackground />
            <Text style={styles.captureTitle}>Zrób zdjęcie lub dodaj plik</Text>
            <Text style={styles.captureSubtitle}>
              Silnik Google ML Kit rozpozna kwotę, datę i sklep lokalnie w piaskownicy telefonu
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.primaryButton, styles.captureBtn]}
                onPress={() => handlePickImage(true)}
                activeOpacity={touchTargets.activeOpacity}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Aparat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.captureBtn]}
                onPress={() => handlePickImage(false)}
                activeOpacity={touchTargets.activeOpacity}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons name="images-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Galeria</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
            <View style={styles.imageActions}>
              {isProcessingOcr ? (
                <View style={styles.ocrLoadingBadge}>
                  <ActivityIndicator size="small" color={colors.primaryLight} />
                  <Text style={styles.ocrLoadingText}>Odczytywanie OCR ML Kit...</Text>
                </View>
              ) : (
                <View style={styles.ocrFinishedBadge}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.success} style={{ marginRight: 5 }} />
                  <Text style={styles.ocrFinishedText}>
                    ML Kit OCR: {ocrProcessingTime ?? 0} ms
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={() => handlePickImage(true)}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons name="refresh" size={14} color="#E2E8F0" style={{ marginRight: 5 }} />
                <Text style={styles.changeImageText}>Zmień</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Wskaźniki pewności OCR z ikonami */}
        {imageUri && !isProcessingOcr && (
          <View style={styles.badgesRow}>
            <View style={[styles.badge, detectedConfidence.hasAmount ? styles.badgeSuccess : styles.badgeWarn]}>
              <Ionicons
                name={detectedConfidence.hasAmount ? 'checkmark-circle' : 'alert-circle'}
                size={13}
                color={detectedConfidence.hasAmount ? colors.success : colors.warning}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.badgeText}>
                {detectedConfidence.hasAmount ? 'Kwota wykryta' : 'Weryfikacja kwoty'}
              </Text>
            </View>

            <View style={[styles.badge, detectedConfidence.hasDate ? styles.badgeSuccess : styles.badgeWarn]}>
              <Ionicons
                name={detectedConfidence.hasDate ? 'checkmark-circle' : 'alert-circle'}
                size={13}
                color={detectedConfidence.hasDate ? colors.success : colors.warning}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.badgeText}>
                {detectedConfidence.hasDate ? 'Data wykryta' : 'Weryfikacja daty'}
              </Text>
            </View>

            <View style={[styles.badge, detectedConfidence.hasStore ? styles.badgeSuccess : styles.badgeNeutral]}>
              <Ionicons
                name={detectedConfidence.hasStore ? 'checkmark-circle' : 'information-circle'}
                size={13}
                color={detectedConfidence.hasStore ? colors.success : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.badgeText}>
                {detectedConfidence.hasStore ? 'Sklep wykryty' : 'Sklep opcjonalny'}
              </Text>
            </View>
          </View>
        )}

        {/* Formularz weryfikacji */}
        <View style={styles.formSectionHeaderRow}>
          <Ionicons name="receipt-outline" size={16} color={colors.primaryLight} style={{ marginRight: 6 }} />
          <Text style={styles.formSectionTitle}>Szczegóły Zakupu</Text>
        </View>

        {/* Tytuł */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="pricetag-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.label}>Tytuł dokumentu *</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="np. MediaMarkt - Słuchawki Sony"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Kwota i Waluta */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <View style={styles.labelRow}>
              <Ionicons name="cash-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.label}>Kwota *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={totalAmount}
              onChangeText={setTotalAmount}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Waluta</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="PLN"
              placeholderTextColor={colors.textMuted}
              value={currency}
              onChangeText={setCurrency}
            />
          </View>
        </View>

        {/* Data zakupu */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.label}>Data zakupu (RRRR-MM-DD) *</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="2026-10-27"
            placeholderTextColor={colors.textMuted}
            value={purchaseDate}
            onChangeText={setPurchaseDate}
          />
        </View>

        {/* Sklep i NIP */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <View style={styles.labelRow}>
              <Ionicons name="business-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.label}>Nazwa sklepu</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="np. MediaMarkt, Biedronka"
              placeholderTextColor={colors.textMuted}
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1.5, marginLeft: 12 }]}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>NIP sprzedawcy</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="np. 5270008098"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={taxId}
              onChangeText={setTaxId}
            />
          </View>
        </View>

        {/* Wybór kategorii */}
        <View style={styles.labelRow}>
          <Ionicons name="folder-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.label}>Kategoria</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const meta = getCategoryMeta(cat.name);

            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                activeOpacity={touchTargets.activeOpacity}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons
                  name={meta.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : meta.color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Okres gwarancji */}
        <View style={[styles.labelRow, { marginTop: spacing.sm }]}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.label}>Okres gwarancji / rękojmi</Text>
        </View>
        <View style={styles.warrantyRow}>
          {WARRANTY_OPTIONS.map((opt) => {
            const isSelected = warrantyMonths === opt.months;
            return (
              <TouchableOpacity
                key={opt.months}
                style={[styles.warrantyChip, isSelected && styles.warrantyChipSelected]}
                onPress={() => setWarrantyMonths(opt.months)}
                activeOpacity={touchTargets.activeOpacity}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.warrantyChipText, isSelected && styles.warrantyChipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Okno zwrotu */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="return-up-back-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.label}>Prawo do zwrotu (dni)</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="14"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={returnDays}
            onChangeText={setReturnDays}
          />
        </View>

        {/* Notatki */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="chatbox-ellipses-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.label}>Dodatkowe notatki</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="np. Numer zamówienia, numer paragonu fiskalnego, warunki serwisu..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Przycisk Zapisz z ikoną kłódki */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={touchTargets.activeOpacity}
          accessibilityRole="button"
          accessibilityLabel="Zapisz paragon w bezpiecznym sejfie"
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Zapisz w sejfie</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CameraDisclosureModal
        visible={showCameraDisclosure}
        onAccept={handleCameraDisclosureAccept}
        onDecline={() => setShowCameraDisclosure(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  captureCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.medium,
  },
  captureTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  captureSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 17,
    maxWidth: 300,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  captureBtn: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    minHeight: touchTargets.minHeight,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceElevated,
    minHeight: touchTargets.minHeight,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  secondaryButtonText: {
    color: '#F1F5F9',
    fontWeight: '700',
    fontSize: 14,
  },
  imagePreviewContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.subtle,
  },
  imagePreview: {
    width: '100%',
    height: 190,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
  },
  ocrLoadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ocrLoadingText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  ocrFinishedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrFinishedText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  changeImageBtn: {
    paddingHorizontal: spacing.md,
    minHeight: 36,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeNeutral: {
    backgroundColor: colors.surface,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  formSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  formSectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: spacing.sm + 4,
  },
  row: {
    flexDirection: 'row',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: spacing.sm + 4,
    paddingVertical: 2,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    borderRadius: radii.xl,
    marginRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  warrantyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm + 4,
  },
  warrantyChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warrantyChipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryLight,
  },
  warrantyChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  warrantyChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.medium,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
