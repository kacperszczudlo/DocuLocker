import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getDatabase } from '@/database/connection';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentWithDetails, CategoryRow } from '@/database/types';
import { PdfGenerator, ComplaintData } from '@/services/pdf/pdfGenerator';
import { colors, spacing, radii, typography, touchTargets } from '@/theme/tokens';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [results, setResults] = useState<DocumentWithDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal podgladu paragonu
  const [previewDoc, setPreviewDoc] = useState<DocumentWithDetails | null>(null);

  // Modal generatora PDF
  const [complaintDoc, setComplaintDoc] = useState<DocumentWithDetails | null>(null);
  const [consumerName, setConsumerName] = useState('');
  const [consumerPhone, setConsumerPhone] = useState('');
  const [consumerEmail, setConsumerEmail] = useState('');
  const [consumerAddress, setConsumerAddress] = useState('');
  const [defectNoticeDate, setDefectNoticeDate] = useState(new Date().toISOString().slice(0, 10));
  const [defectDescription, setDefectDescription] = useState('');
  const [consumerDemand, setConsumerDemand] = useState<ComplaintData['consumerDemand']>('REPAIR');
  const [bankAccount, setBankAccount] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const db = await getDatabase();
      const catRepo = new CategoryRepository(db);
      const cats = await catRepo.listCategories();
      setCategories(cats);
    } catch (err) {
      console.error('[DocuLocker] Blad ladowania kategorii:', err);
    }
  }, []);

  const performSearch = useCallback(async (query: string, catId?: number) => {
    setIsSearching(true);
    try {
      const db = await getDatabase();
      const docRepo = new DocumentRepository(db);
      const docs = await docRepo.searchFullText(query, catId);
      setResults(docs);
    } catch (err) {
      console.error('[DocuLocker] Blad wyszukiwania FTS5:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      performSearch(searchQuery, selectedCategory);
    }, [loadCategories, performSearch, searchQuery, selectedCategory])
  );

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    performSearch(text, selectedCategory);
  };

  const handleCategorySelect = (catId?: number) => {
    const nextCat = selectedCategory === catId ? undefined : catId;
    setSelectedCategory(nextCat);
    performSearch(searchQuery, nextCat);
  };

  const handleOpenComplaintModal = (doc: DocumentWithDetails) => {
    setComplaintDoc(doc);
    setDefectDescription('');
    setDefectNoticeDate(new Date().toISOString().slice(0, 10));
    setConsumerDemand('REPAIR');
  };

  const handleGeneratePdf = async () => {
    if (!complaintDoc) return;
    if (!consumerName.trim()) {
      Alert.alert('Wymagane pole', 'Wpisz imię i nazwisko konsumenta.');
      return;
    }
    if (!defectDescription.trim()) {
      Alert.alert('Wymagane pole', 'Wprowadź krótki opis stwierdzonej usterki.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const generator = new PdfGenerator();
      const complaintData: ComplaintData = {
        documentId: complaintDoc.id,
        productTitle: complaintDoc.title,
        storeName: complaintDoc.store_name || 'Brak danych sprzedawcy',
        purchaseDate: complaintDoc.purchase_date,
        totalAmount: complaintDoc.total_amount,
        currency: complaintDoc.currency,
        warrantyEndDate: complaintDoc.warranty_end_date,
        receiptImageUri: complaintDoc.primary_image_path,
        consumerName: consumerName.trim(),
        consumerPhone: consumerPhone.trim() || undefined,
        consumerEmail: consumerEmail.trim() || undefined,
        consumerAddress: consumerAddress.trim() || undefined,
        defectNoticeDate: defectNoticeDate.trim(),
        defectDescription: defectDescription.trim(),
        consumerDemand,
        bankAccountNumber: bankAccount.trim() || undefined,
      };

      await generator.generateAndShareComplaintPdf(complaintData);
      setComplaintDoc(null);
    } catch (err) {
      console.error('[DocuLocker] Blad generowania PDF:', err);
      Alert.alert('Błąd', 'Nie udało się wygenerować lub udostępnić pliku PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getOcrSnippet = (doc: DocumentWithDetails, query: string): string | null => {
    if (!query.trim() || !doc.raw_ocr_text) return null;
    const q = query.trim().toLowerCase();
    const text = doc.raw_ocr_text;
    const lowerText = text.toLowerCase();
    const idx = lowerText.indexOf(q);
    if (idx === -1) return null;

    const start = Math.max(0, idx - 25);
    const end = Math.min(text.length, idx + q.length + 25);
    let snippet = text.slice(start, end).replace(/\n/g, ' ');
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  };

  const renderDocumentCard = ({ item }: { item: DocumentWithDetails }) => {
    const ocrSnippet = getOcrSnippet(item, searchQuery);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.storeCol}>
            <Text style={styles.storeName}>{item.store_name ?? 'Inny sklep'}</Text>
            {item.category_name && (
              <Text style={styles.categoryPill}>{item.category_name}</Text>
            )}
          </View>
          <Text style={styles.amountText}>
            {item.total_amount.toFixed(2)} {item.currency}
          </Text>
        </View>

        <Text style={styles.titleText}>{item.title}</Text>

        {/* Snippet z odnalezionym tekstem w OCR (pelne tlo, bez zakazanego borderLeft side-stripe) */}
        {ocrSnippet && (
          <View style={styles.ocrSnippetBox}>
            <View style={styles.ocrSnippetHeader}>
              <Text style={styles.ocrSnippetIcon}>🎯</Text>
              <Text style={styles.ocrSnippetLabel}>Trafienie w treści OCR:</Text>
            </View>
            <Text style={styles.ocrSnippetText}>"{ocrSnippet}"</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📅 Zakup: {item.purchase_date}</Text>
          {item.warranty_end_date && (
            <Text style={styles.metaText}>🛡️ Gwarancja do: {item.warranty_end_date}</Text>
          )}
        </View>

        {/* Przyciski akcji */}
        <View style={styles.actionsRow}>
          {item.primary_image_path && (
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => setPreviewDoc(item)}
              activeOpacity={touchTargets.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel="Podgląd zdjęcia paragonu"
              hitSlop={touchTargets.minHitSlop}
            >
              <Text style={styles.actionBtnOutlineText}>🔍 Podgląd</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => handleOpenComplaintModal(item)}
            activeOpacity={touchTargets.activeOpacity}
            accessibilityRole="button"
            accessibilityLabel="Wygeneruj wniosek reklamacyjny PDF"
            hitSlop={touchTargets.minHitSlop}
          >
            <Text style={styles.actionBtnPrimaryText}>📄 Wniosek PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Naglowek */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Szukaj w Sejfie</Text>
        <Text style={styles.headerSubtitle}>
          Wyszukiwarka pełnotekstowa SQLite FTS5 (OCR, pozycje, sklepy)
        </Text>
      </View>

      {/* Pasek wyszukiwania */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj produktu z paragonu, sklepu, NIP..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={handleQueryChange}
          autoCapitalize="none"
          accessibilityRole="search"
          accessibilityLabel="Pole wyszukiwania pełnotekstowego FTS5"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleQueryChange('')}
            style={styles.clearBtn}
            hitSlop={touchTargets.minHitSlop}
            accessibilityRole="button"
            accessibilityLabel="Wyczyść wyszukiwanie"
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Kategorie */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.id.toString()}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => handleCategorySelect(item.id)}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel={`Kategoria ${item.name}`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={touchTargets.minHitSlop}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Licznik wynikow */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCountText}>
          {isSearching
            ? 'Przeszukiwanie bazy SQLite...'
            : `Znaleziono ${results.length} ${results.length === 1 ? 'pozycję' : 'pozycji'}`}
        </Text>
      </View>

      {/* Lista wynikow */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderDocumentCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Brak wyników</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `Nie znaleziono paragonów zawierających frazę "${searchQuery}". Spróbuj innego słowa lub wyszukaj po nazwie sklepu.`
                : 'Wpisz nazwę zakupionego przedmiotu lub sklepu, aby przeszukać bazę.'}
            </Text>
          </View>
        }
      />

      {/* Modal Podgladu Zdjecia Paragonu */}
      <Modal
        visible={!!previewDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewDoc?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewDoc(null)}
                hitSlop={touchTargets.minHitSlop}
                accessibilityRole="button"
                accessibilityLabel="Zamknij podgląd"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {previewDoc?.primary_image_path ? (
              <Image
                source={{ uri: previewDoc.primary_image_path }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.noImageText}>Brak zapisanego zdjęcia dla tego dokumentu.</Text>
            )}
            <TouchableOpacity
              style={styles.closeFullBtn}
              onPress={() => setPreviewDoc(null)}
              activeOpacity={touchTargets.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel="Zamknij"
            >
              <Text style={styles.closeFullBtnText}>Zamknij podgląd</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Generatora Pisma Reklamacyjnego PDF */}
      <Modal
        visible={!!complaintDoc}
        transparent
        animationType="slide"
        onRequestClose={() => setComplaintDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.complaintModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.complaintModalTitle}>Zgłoszenie Reklamacyjne PDF</Text>
              <TouchableOpacity
                onPress={() => setComplaintDoc(null)}
                hitSlop={touchTargets.minHitSlop}
                accessibilityRole="button"
                accessibilityLabel="Zamknij formularz reklamacyjny"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.complaintScroll} showsVerticalScrollIndicator={false}>
              {/* Informacja o przedmiocie */}
              <View style={styles.complaintSummaryBox}>
                <Text style={styles.complaintProductTitle}>{complaintDoc?.title}</Text>
                <Text style={styles.complaintProductDetails}>
                  Sklep: {complaintDoc?.store_name} | Data zakupu: {complaintDoc?.purchase_date} | Kwota: {complaintDoc?.total_amount.toFixed(2)} {complaintDoc?.currency}
                </Text>
              </View>

              <Text style={styles.formSectionHeader}>Dane Konsumenta (Zgłaszającego)</Text>
              <TextInput
                style={styles.input}
                placeholder="Imię i nazwisko (wymagane)"
                placeholderTextColor={colors.textMuted}
                value={consumerName}
                onChangeText={setConsumerName}
              />
              <TextInput
                style={styles.input}
                placeholder="Adres korespondencyjny (ulica, kod, miasto)"
                placeholderTextColor={colors.textMuted}
                value={consumerAddress}
                onChangeText={setConsumerAddress}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Numer telefonu"
                  placeholderTextColor={colors.textMuted}
                  value={consumerPhone}
                  onChangeText={setConsumerPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Adres e-mail"
                  placeholderTextColor={colors.textMuted}
                  value={consumerEmail}
                  onChangeText={setConsumerEmail}
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.formSectionHeader}>Szczegóły Usterki</Text>
              <TextInput
                style={styles.input}
                placeholder="Data ujawnienia wady (YYYY-MM-DD)"
                placeholderTextColor={colors.textMuted}
                value={defectNoticeDate}
                onChangeText={setDefectNoticeDate}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Dokładny opis wady / usterki (wymagane)..."
                placeholderTextColor={colors.textMuted}
                value={defectDescription}
                onChangeText={setDefectDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.formSectionHeader}>Żądanie Reklamacyjne</Text>
              <View style={styles.demandOptions}>
                {[
                  { key: 'REPAIR' as const, label: 'Naprawa' },
                  { key: 'REPLACEMENT' as const, label: 'Wymiana na nowy' },
                  { key: 'REFUND' as const, label: 'Zwrot gotówki' },
                  { key: 'PRICE_REDUCTION' as const, label: 'Obniżenie ceny' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.demandBtn, consumerDemand === opt.key && styles.demandBtnSelected]}
                    onPress={() => setConsumerDemand(opt.key)}
                    activeOpacity={touchTargets.activeOpacity}
                    accessibilityRole="button"
                    accessibilityLabel={`Żądanie: ${opt.label}`}
                    accessibilityState={{ selected: consumerDemand === opt.key }}
                  >
                    <Text
                      style={[
                        styles.demandBtnText,
                        consumerDemand === opt.key && styles.demandBtnTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(consumerDemand === 'REFUND' || consumerDemand === 'PRICE_REDUCTION') && (
                <TextInput
                  style={styles.input}
                  placeholder="Numer konta bankowego do zwrotu środków"
                  placeholderTextColor={colors.textMuted}
                  value={bankAccount}
                  onChangeText={setBankAccount}
                />
              )}
            </ScrollView>

            {/* Przyciski dolne modalu */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setComplaintDoc(null)}
                disabled={isGeneratingPdf}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel="Anuluj"
              >
                <Text style={styles.cancelBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGeneratePdf}
                disabled={isGeneratingPdf}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel="Generuj i udostępnij wniosek PDF"
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.generateBtnText}>Generuj i Udostępnij PDF</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 46,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.textPrimary,
    fontSize: 14,
  },
  clearBtn: {
    padding: spacing.sm,
  },
  clearBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: spacing.xs,
  },
  categoriesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
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
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  resultsCountText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  storeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  storeName: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryPill: {
    color: colors.textSecondary,
    fontSize: 11,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  titleText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  ocrSnippetBox: {
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  ocrSnippetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  ocrSnippetIcon: {
    fontSize: 11,
  },
  ocrSnippetLabel: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ocrSnippetText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  actionBtnOutline: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  previewContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    maxHeight: '85%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
    padding: spacing.xs,
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  noImageText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  closeFullBtn: {
    backgroundColor: colors.surfaceElevated,
    minHeight: 44,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  complaintModalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  complaintModalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  complaintScroll: {
    marginBottom: spacing.sm,
  },
  complaintSummaryBox: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  complaintProductTitle: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  complaintProductDetails: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  formSectionHeader: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  inputMultiline: {
    height: 75,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputHalf: {
    flex: 1,
  },
  demandOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  demandBtn: {
    backgroundColor: colors.background,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demandBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  demandBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  demandBtnTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  generateBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    minWidth: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
