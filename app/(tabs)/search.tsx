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
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '@/database/connection';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentWithDetails, CategoryRow } from '@/database/types';
import { PdfGenerator, ComplaintData } from '@/services/pdf/pdfGenerator';
import { colors, spacing, radii, typography, touchTargets, iconSizes, shadows, CATEGORY_ICON_MAP } from '@/theme/tokens';
import { BrandLogo } from '@/components/BrandLogo';

/**
 * Ekran wyszukiwania pełnotekstowego FTS5 w bazie dokumentów SQLite.
 * Obsługuje filtrowanie po kategoriach z wektorowymi ikonami, podgląd skanów oraz generator wniosków PDF.
 */
export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [results, setResults] = useState<DocumentWithDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal podglądu paragonu
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
      console.error('[DocuLocker] Błąd ładowania kategorii:', err);
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
      console.error('[DocuLocker] Błąd wyszukiwania FTS5:', err);
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
      Alert.alert('Wymagane pole', 'Wprowadź opis stwierdzonej usterki.');
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
      console.error('[DocuLocker] Błąd generowania PDF:', err);
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

  const getCategoryMeta = (catName?: string | null) => {
    if (!catName || !CATEGORY_ICON_MAP[catName]) {
      return {
        icon: 'receipt-outline',
        color: colors.primaryLight,
        bg: colors.primarySubtle,
      };
    }
    return CATEGORY_ICON_MAP[catName];
  };

  const renderDocumentCard = ({ item }: { item: DocumentWithDetails }) => {
    const ocrSnippet = getOcrSnippet(item, searchQuery);
    const catMeta = getCategoryMeta(item.category_name);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.storeCol}>
            <View style={[styles.cardCatIconBox, { backgroundColor: catMeta.bg }]}>
              <Ionicons name={catMeta.icon as any} size={15} color={catMeta.color} />
            </View>
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

        {/* Snippet z odnalezionym tekstem w OCR */}
        {ocrSnippet && (
          <View style={styles.ocrSnippetBox}>
            <View style={styles.ocrSnippetHeader}>
              <Ionicons name="search" size={12} color={colors.primaryLight} style={{ marginRight: 4 }} />
              <Text style={styles.ocrSnippetLabel}>Trafienie w treści OCR:</Text>
            </View>
            <Text style={styles.ocrSnippetText}>"{ocrSnippet}"</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>Zakup: {item.purchase_date}</Text>
          </View>
          {item.warranty_end_date && (
            <View style={styles.metaItem}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.success }]}>
                Ochrona: {item.warranty_end_date}
              </Text>
            </View>
          )}
        </View>

        {/* Przyciski akcji z ikonami */}
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
              <Ionicons name="eye-outline" size={15} color={colors.textSecondary} style={{ marginRight: 5 }} />
              <Text style={styles.actionBtnOutlineText}>Podgląd</Text>
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
            <Ionicons name="document-text-outline" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.actionBtnPrimaryText}>Wniosek PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Pasek wyszukiwania */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.primaryLight} style={{ marginRight: spacing.sm }} />
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
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Kategorie z ikonami */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: -1, name: 'Wszystkie' }, ...categories]}
          keyExtractor={(c) => c.id.toString()}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isAll = item.id === -1;
            const isSelected = isAll ? selectedCategory === undefined : selectedCategory === item.id;
            const meta = isAll
              ? { icon: 'grid-outline', color: isSelected ? '#FFFFFF' : colors.textSecondary }
              : {
                  icon: getCategoryMeta(item.name).icon,
                  color: isSelected ? '#FFFFFF' : getCategoryMeta(item.name).color,
                };

            return (
              <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => handleCategorySelect(isAll ? undefined : item.id)}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel={`Kategoria ${item.name}`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons
                  name={meta.icon as any}
                  size={14}
                  color={meta.color}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Licznik wyników */}
      <View style={styles.resultsHeader}>
        <Ionicons name="server-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
        <Text style={styles.resultsCountText}>
          {isSearching
            ? 'Przeszukiwanie indeksów SQLite FTS5...'
            : `Znaleziono ${results.length} ${results.length === 1 ? 'pozycję' : 'pozycji'}`}
        </Text>
      </View>

      {/* Lista wyników */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderDocumentCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BrandLogo size={76} variant="lock" showBackground />
            <Text style={styles.emptyTitle}>Brak wyników wyszukiwania</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `Nie znaleziono pozycji zawierających frazę "${searchQuery}". Silnik FTS5 przeszukuje zarówno nazwy, jak i pełny odczyt OCR.`
                : 'Wpisz nazwę zakupionego przedmiotu, sklepu lub NIP, aby przeszukać bazę.'}
            </Text>
          </View>
        }
      />

      {/* Modal Podglądu Zdjęcia Paragonu */}
      <Modal
        visible={!!previewDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderIcon}>
                <Ionicons name="image-outline" size={18} color={colors.primaryLight} />
              </View>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewDoc?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewDoc(null)}
                hitSlop={touchTargets.minHitSlop}
                accessibilityRole="button"
                accessibilityLabel="Zamknij podgląd"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {previewDoc?.primary_image_path ? (
              <Image
                source={{ uri: previewDoc.primary_image_path }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noImageBox}>
                <Ionicons name="document-outline" size={48} color={colors.textMuted} />
                <Text style={styles.noImageText}>Brak zapisanego pliku zdjęcia.</Text>
              </View>
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
              <View style={styles.complaintHeaderIcon}>
                <Ionicons name="document-text" size={20} color={colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.complaintModalTitle}>Zgłoszenie Reklamacyjne PDF</Text>
                <Text style={styles.complaintModalSubtitle}>Oficjalne pismo z tytułu rękojmi</Text>
              </View>
              <TouchableOpacity
                onPress={() => setComplaintDoc(null)}
                hitSlop={touchTargets.minHitSlop}
                accessibilityRole="button"
                accessibilityLabel="Zamknij formularz reklamacyjny"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
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

              <View style={styles.formSectionHeaderRow}>
                <Ionicons name="person-outline" size={14} color={colors.primaryLight} style={{ marginRight: 5 }} />
                <Text style={styles.formSectionHeader}>Dane Konsumenta (Zgłaszającego)</Text>
              </View>

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

              <View style={styles.formSectionHeaderRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.primaryLight} style={{ marginRight: 5 }} />
                <Text style={styles.formSectionHeader}>Szczegóły Usterki</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Data ujawnienia wady (YYYY-MM-DD)"
                placeholderTextColor={colors.textMuted}
                value={defectNoticeDate}
                onChangeText={setDefectNoticeDate}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Dokładny opis wady lub usterki (np. samoczynne wyłączanie)..."
                placeholderTextColor={colors.textMuted}
                value={defectDescription}
                onChangeText={setDefectDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.formSectionHeaderRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primaryLight} style={{ marginRight: 5 }} />
                <Text style={styles.formSectionHeader}>Żądanie Reklamacyjne (Art. 560 KC)</Text>
              </View>

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
                    <Ionicons
                      name={consumerDemand === opt.key ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={consumerDemand === opt.key ? '#FFFFFF' : colors.textSecondary}
                      style={{ marginRight: 5 }}
                    />
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
                  <>
                    <Ionicons name="print-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.generateBtnText}>Generuj i Udostępnij PDF</Text>
                  </>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 48,
    ...shadows.subtle,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontSize: 14,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  categoriesContainer: {
    marginBottom: spacing.xs,
  },
  categoriesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.subtle,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardCatIconBox: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  storeName: {
    color: colors.textPrimary,
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
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  titleText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  ocrSnippetBox: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  ocrSnippetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  actionBtnOutline: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.subtle,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
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
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: 380,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  noImageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  noImageText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  closeFullBtn: {
    backgroundColor: colors.surfaceElevated,
    minHeight: 44,
    borderRadius: radii.md,
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
    borderColor: colors.borderSubtle,
    ...shadows.medium,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  complaintHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  complaintModalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  complaintModalSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  complaintScroll: {
    marginBottom: spacing.sm,
  },
  complaintSummaryBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
  formSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  formSectionHeader: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
    minHeight: 46,
  },
  inputMultiline: {
    height: 80,
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
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
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
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
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
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    minWidth: 190,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.subtle,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
