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
import { getDatabase } from '@/database/connection';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { StoreRepository } from '@/database/repositories/storeRepository';
import { FileStorageService } from '@/services/storage/fileStorageService';
import { MlKitOcrEngine } from '@/services/ocr/ocrEngine';
import { ScanReceiptUseCase } from '@/core/useCases/scanReceiptUseCase';
import { SaveDocumentUseCase } from '@/core/useCases/saveDocumentUseCase';
import { CategoryRow } from '@/database/types';

const WARRANTY_OPTIONS = [
  { label: 'Brak', months: 0 },
  { label: '12 m-cy', months: 12 },
  { label: '24 m-ce (Standard)', months: 24 },
  { label: '36 m-cy', months: 36 },
  { label: '60 m-cy (5 lat)', months: 60 },
];

export default function ScanScreen() {
  const router = useRouter();

  // State
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
        if (list.length > 0) {
          setSelectedCategoryId(list[0].id);
        }
      } catch (err) {
        console.error('Blad ladowania kategorii:', err);
      }
    }
    loadCategories();
  }, []);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Brak uprawnien', 'Aplikacja potrzebuje dostepu do aparatu.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: false,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Brak uprawnien', 'Aplikacja potrzebuje dostepu do galerii.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: false,
        });
      }

      console.log('[DocuLocker] ImagePicker result canceled:', result.canceled, 'assets:', result.assets?.length);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        console.log('[DocuLocker] Image selected uri:', selectedUri);
        setImageUri(selectedUri);
        await processReceiptImage(selectedUri);
      }
    } catch (err) {
      console.error('[DocuLocker] Blad wyboru zdjecia:', err);
      Alert.alert('Blad', 'Nie udalo sie pobrac zdjecia.');
    }
  };

  const processReceiptImage = async (uri: string) => {
    setIsProcessingOcr(true);
    const startTime = Date.now();
    try {
      console.log('[DocuLocker] Rozpoczynam inferencje ML Kit dla:', uri);
      const ocrEngine = new MlKitOcrEngine();
      const scanUseCase = new ScanReceiptUseCase(ocrEngine);
      const parsed = await scanUseCase.execute(uri);

      console.log('[DocuLocker] Wynik parsowania paragonu:', JSON.stringify({
        suggestedTitle: parsed.suggestedTitle,
        storeName: parsed.storeName,
        totalAmount: parsed.totalAmount,
        purchaseDate: parsed.purchaseDate,
      }));

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

      setDetectedConfidence({
        hasAmount: !!parsed.totalAmount,
        hasDate: !!parsed.purchaseDate,
        hasStore: !!parsed.storeName,
      });
    } catch (err) {
      console.error('[DocuLocker] Blad inferencji OCR:', err);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Wymagane pole', 'Wprowadz tytul dokumentu.');
      return;
    }

    const parsedAmount = parseFloat(totalAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Niepoprawna kwota', 'Wprowadz poprawna kwote transakcji.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
      Alert.alert('Niepoprawna data', 'Wprowadz date w formacie RRRR-MM-DD.');
      return;
    }

    setIsSaving(true);
    try {
      const db = await getDatabase();
      const docRepo = new DocumentRepository(db);
      const storeRepo = new StoreRepository(db);
      const storageService = new FileStorageService();
      const saveUseCase = new SaveDocumentUseCase(docRepo, storeRepo, storageService);

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
      console.error('Blad zapisu paragonu:', err);
      Alert.alert('Blad zapisu', 'Nie udalo sie zapisac paragonu w bazie SQLite.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Sekcja dodawania zdjęcia */}
        {!imageUri ? (
          <View style={styles.captureCard}>
            <Text style={styles.captureTitle}>Dodaj zdjecie paragonu</Text>
            <Text style={styles.captureSubtitle}>
              Przetwarzanie OCR odbywa sie w 100% lokalnie na telefonie
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.primaryButton, styles.captureBtn]}
                onPress={() => handlePickImage(true)}
              >
                <Text style={styles.primaryButtonText}>Aparat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.captureBtn]}
                onPress={() => handlePickImage(false)}
              >
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
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={styles.ocrLoadingText}>Odczytywanie OCR...</Text>
                </View>
              ) : (
                <View style={styles.ocrFinishedBadge}>
                  <Text style={styles.ocrFinishedText}>
                    ML Kit OCR: {ocrProcessingTime ?? 0} ms
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={() => handlePickImage(true)}
              >
                <Text style={styles.changeImageText}>Zmien</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Wskaźniki pewności OCR */}
        {imageUri && !isProcessingOcr && (
          <View style={styles.badgesRow}>
            <View style={[styles.badge, detectedConfidence.hasAmount ? styles.badgeSuccess : styles.badgeWarn]}>
              <Text style={styles.badgeText}>
                {detectedConfidence.hasAmount ? '✓ Kwota wykryta' : '⚠️ Sprawdz kwote'}
              </Text>
            </View>
            <View style={[styles.badge, detectedConfidence.hasDate ? styles.badgeSuccess : styles.badgeWarn]}>
              <Text style={styles.badgeText}>
                {detectedConfidence.hasDate ? '✓ Data wykryta' : '⚠️ Sprawdz date'}
              </Text>
            </View>
            <View style={[styles.badge, detectedConfidence.hasStore ? styles.badgeSuccess : styles.badgeNeutral]}>
              <Text style={styles.badgeText}>
                {detectedConfidence.hasStore ? '✓ Sklep wykryty' : 'Sklep opcjonalny'}
              </Text>
            </View>
          </View>
        )}

        {/* Formularz weryfikacji */}
        <Text style={styles.formSectionTitle}>Szczegoly zakupu</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tytul dokumentu *</Text>
          <TextInput
            style={styles.input}
            placeholder="np. Biedronka - Zakupy"
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Kwota *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={totalAmount}
              onChangeText={setTotalAmount}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Waluta</Text>
            <TextInput
              style={styles.input}
              placeholder="PLN"
              placeholderTextColor="#64748B"
              value={currency}
              onChangeText={setCurrency}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Data zakupu (RRRR-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-10-23"
              placeholderTextColor="#64748B"
              value={purchaseDate}
              onChangeText={setPurchaseDate}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Nazwa sklepu</Text>
            <TextInput
              style={styles.input}
              placeholder="np. MediaMarkt, Lidl"
              placeholderTextColor="#64748B"
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1.5, marginLeft: 12 }]}>
            <Text style={styles.label}>NIP (opcjonalny)</Text>
            <TextInput
              style={styles.input}
              placeholder="np. 5270008098"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={taxId}
              onChangeText={setTaxId}
            />
          </View>
        </View>

        {/* Wybór kategorii */}
        <Text style={styles.label}>Kategoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategoryId(cat.id)}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Okres gwarancji */}
        <Text style={[styles.label, { marginTop: 16 }]}>Okres gwarancji / rekojmi</Text>
        <View style={styles.warrantyRow}>
          {WARRANTY_OPTIONS.map((opt) => {
            const isSelected = warrantyMonths === opt.months;
            return (
              <TouchableOpacity
                key={opt.months}
                style={[styles.warrantyChip, isSelected && styles.warrantyChipSelected]}
                onPress={() => setWarrantyMonths(opt.months)}
              >
                <Text style={[styles.warrantyChipText, isSelected && styles.warrantyChipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Okno zwrotu */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prawo do zwrotu (dni)</Text>
          <TextInput
            style={styles.input}
            placeholder="14"
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            value={returnDays}
            onChangeText={setReturnDays}
          />
        </View>

        {/* Notatki */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notatki</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Dodatkowe uwagi, numer paragonu..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Przycisk Zapisz */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Zapisz w sejfie</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  captureCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  captureTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  captureSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  captureBtn: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F1F5F9',
    fontWeight: '600',
    fontSize: 15,
  },
  imagePreviewContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  ocrLoadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ocrLoadingText: {
    color: '#38BDF8',
    fontSize: 13,
  },
  ocrFinishedBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ocrFinishedText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '500',
  },
  changeImageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  changeImageText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  badgeSuccess: {
    backgroundColor: '#064E3B',
  },
  badgeWarn: {
    backgroundColor: '#78350F',
  },
  badgeNeutral: {
    backgroundColor: '#1E293B',
  },
  badgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '500',
  },
  formSectionTitle: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  categoryChipText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  warrantyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  warrantyChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warrantyChipSelected: {
    backgroundColor: '#0369A1',
    borderColor: '#38BDF8',
  },
  warrantyChipText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  warrantyChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
