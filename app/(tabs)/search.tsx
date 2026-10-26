import React, { useState, useCallback, useEffect } from 'react';
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

  /**
   * Wyciaga snippet z tekstu OCR jesli fraza nie wystepuje w tytule
   */
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

        {/* Snippet z odnalezionym tekstem w OCR */}
        {ocrSnippet && (
          <View style={styles.ocrSnippetBox}>
            <Text style={styles.ocrSnippetLabel}>Trafienie w treści OCR:</Text>
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
            >
              <Text style={styles.actionBtnOutlineText}>🔍 Podgląd</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => handleOpenComplaintModal(item)}
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
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={handleQueryChange}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleQueryChange('')} style={styles.clearBtn}>
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
              <TouchableOpacity onPress={() => setPreviewDoc(null)}>
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
              <TouchableOpacity onPress={() => setComplaintDoc(null)}>
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
                placeholderTextColor="#64748B"
                value={consumerName}
                onChangeText={setConsumerName}
              />
              <TextInput
                style={styles.input}
                placeholder="Adres korespondencyjny (ulica, kod, miasto)"
                placeholderTextColor="#64748B"
                value={consumerAddress}
                onChangeText={setConsumerAddress}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Numer telefonu"
                  placeholderTextColor="#64748B"
                  value={consumerPhone}
                  onChangeText={setConsumerPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Adres e-mail"
                  placeholderTextColor="#64748B"
                  value={consumerEmail}
                  onChangeText={setConsumerEmail}
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.formSectionHeader}>Szczegóły Usterki</Text>
              <TextInput
                style={styles.input}
                placeholder="Data ujawnienia wady (YYYY-MM-DD)"
                placeholderTextColor="#64748B"
                value={defectNoticeDate}
                onChangeText={setDefectNoticeDate}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Dokładny opis wady / usterki (wymagane)..."
                placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
              >
                <Text style={styles.cancelBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGeneratePdf}
                disabled={isGeneratingPdf}
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
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#F8FAFC',
    fontSize: 14,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: 6,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  categoryChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  resultsCountText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  storeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  storeName: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryPill: {
    color: '#94A3B8',
    fontSize: 11,
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  amountText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  ocrSnippetBox: {
    backgroundColor: '#0F172A',
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  ocrSnippetLabel: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ocrSnippetText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    gap: 10,
  },
  actionBtnOutline: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0F172A',
  },
  actionBtnOutlineText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#0284C7',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  previewContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    maxHeight: '85%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    marginBottom: 12,
  },
  noImageText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  closeFullBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFullBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  complaintModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  complaintModalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  complaintScroll: {
    marginBottom: 12,
  },
  complaintSummaryBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  complaintProductTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  complaintProductDetails: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  formSectionHeader: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  inputMultiline: {
    height: 75,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputHalf: {
    flex: 1,
  },
  demandOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  demandBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demandBtnSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  demandBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  demandBtnTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  generateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    minWidth: 180,
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
