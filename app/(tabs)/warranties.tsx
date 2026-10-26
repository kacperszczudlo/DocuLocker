import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDatabase } from '@/database/connection';
import { WarrantyRepository, WarrantyItemWithDetails, WarrantyStats } from '@/database/repositories/warrantyRepository';
import { WarrantyStatus } from '@/database/types';

type FilterTab = 'ALL' | WarrantyStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Wszystkie' },
  { key: 'EXPIRING_SOON', label: 'Wygasające' },
  { key: 'ACTIVE', label: 'Aktywne' },
  { key: 'EXPIRED', label: 'Wygasłe' },
  { key: 'CLAIMED', label: 'Reklamowane' },
];

export default function WarrantiesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WarrantyItemWithDetails[]>([]);
  const [stats, setStats] = useState<WarrantyStats>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    claimed: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal reklamacji
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<WarrantyItemWithDetails | null>(null);
  const [claimNotes, setClaimNotes] = useState('');

  const loadWarranties = useCallback(async () => {
    try {
      const db = await getDatabase();
      const repo = new WarrantyRepository(db);

      // Synchronizacja statusow na bazie dzisiejszej daty
      await repo.syncStatuses();

      const [loadedStats, loadedItems] = await Promise.all([
        repo.getStats(),
        repo.listWarranties({
          status: selectedFilter === 'ALL' ? undefined : selectedFilter,
          search: searchQuery,
        }),
      ]);

      setStats(loadedStats);
      setItems(loadedItems);
    } catch (err) {
      console.error('[DocuLocker] Blad podczas ladowania gwarancji:', err);
    }
  }, [selectedFilter, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadWarranties();
    }, [loadWarranties])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWarranties();
    setRefreshing(false);
  };

  const handleOpenClaimModal = (item: WarrantyItemWithDetails) => {
    setSelectedItemForClaim(item);
    setClaimNotes(item.claim_notes ?? '');
    setClaimModalVisible(true);
  };

  const handleSaveClaim = async () => {
    if (!selectedItemForClaim) return;
    try {
      const db = await getDatabase();
      const repo = new WarrantyRepository(db);
      await repo.markAsClaimed(selectedItemForClaim.document_id, claimNotes.trim() || undefined);
      setClaimModalVisible(false);
      setSelectedItemForClaim(null);
      await loadWarranties();
      Alert.alert('Zapisano', 'Status gwarancji zmieniony na "W trakcie reklamacji".');
    } catch (err) {
      console.error('[DocuLocker] Blad zapisu reklamacji:', err);
      Alert.alert('Blad', 'Nie udalo sie zaktualizowac statusu reklamacji.');
    }
  };

  const handleRestoreStatus = async (item: WarrantyItemWithDetails) => {
    try {
      const db = await getDatabase();
      const repo = new WarrantyRepository(db);
      await repo.restoreWarrantyStatus(item.document_id);
      await loadWarranties();
      Alert.alert('Sukces', 'Przywrócono standardowy status ochrony.');
    } catch (err) {
      console.error('[DocuLocker] Blad przywracania statusu:', err);
    }
  };

  const getFilterCount = (tab: FilterTab): number => {
    switch (tab) {
      case 'ALL':
        return stats.total;
      case 'EXPIRING_SOON':
        return stats.expiringSoon;
      case 'ACTIVE':
        return stats.active;
      case 'EXPIRED':
        return stats.expired;
      case 'CLAIMED':
        return stats.claimed;
      default:
        return 0;
    }
  };

  const renderWarrantyCard = ({ item }: { item: WarrantyItemWithDetails }) => {
    const calc = item.calculation;

    return (
      <View style={styles.card}>
        {/* Naglowek karty: sklep + odznaka statusu */}
        <View style={styles.cardHeader}>
          <View style={styles.storeContainer}>
            <Text style={styles.storeName}>{item.store_name ?? 'Inny sklep'}</Text>
            {item.category_name && (
              <Text style={styles.categoryBadge}>{item.category_name}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${calc.badgeColor}22`, borderColor: calc.badgeColor }]}>
            <Text style={[styles.statusBadgeText, { color: calc.badgeColor }]}>
              {calc.badgeLabel}
            </Text>
          </View>
        </View>

        {/* Tytul i kwota */}
        <View style={styles.titleRow}>
          <Text style={styles.documentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.amountText}>
            {item.total_amount.toFixed(2)} {item.currency}
          </Text>
        </View>

        {/* Pasek postepu gwarancji */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${calc.progressPercentage}%`,
                  backgroundColor: calc.badgeColor,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{calc.progressPercentage}% czasu uplynelo</Text>
        </View>

        {/* Sekcja szczegolow terminow */}
        <View style={styles.datesGrid}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Zakup</Text>
            <Text style={styles.dateValue}>{item.purchase_date}</Text>
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Koniec ochrony ({item.duration_months} m)</Text>
            <Text style={[styles.dateValue, { color: calc.badgeColor, fontWeight: '700' }]}>
              {item.end_date}
            </Text>
          </View>
        </View>

        {/* Informacja o oknie zwrotu */}
        <View style={styles.returnRow}>
          <Text style={styles.returnIcon}>🔄</Text>
          <Text style={styles.returnText}>
            Zwrot towaru: {item.return_deadline}{' '}
            {calc.returnStatus === 'CAN_RETURN' ? (
              <Text style={styles.returnActiveText}>(jeszcze {calc.returnDaysRemaining} dni)</Text>
            ) : (
              <Text style={styles.returnExpiredText}>(termin minął)</Text>
            )}
          </Text>
        </View>

        {/* Notatka reklamacyjna jesli istnieje */}
        {item.claim_notes && (
          <View style={styles.claimNoteBox}>
            <Text style={styles.claimNoteLabel}>Notatka reklamacyjna:</Text>
            <Text style={styles.claimNoteText}>{item.claim_notes}</Text>
          </View>
        )}

        {/* Przyciski akcji na karcie */}
        <View style={styles.actionsRow}>
          {item.status === 'CLAIMED' ? (
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={() => handleRestoreStatus(item)}
            >
              <Text style={styles.restoreBtnText}>Zakończ reklamację</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => handleOpenClaimModal(item)}
            >
              <Text style={styles.claimBtnText}>Zgłoś reklamację / serwis</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Naglowek modulu */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Strażnik Gwarancji</Text>
        <Text style={styles.headerSubtitle}>
          Lokalny monitoring terminów rękojmi i zwrotów
        </Text>
      </View>

      {/* Pasek wyszukiwania */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj produktu lub sklepu..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Zakladki filtrow */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(t) => t.key}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.key;
            const count = getFilterCount(item.key);
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => setSelectedFilter(item.key)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                  {item.label}
                </Text>
                <View style={[styles.filterBadge, isSelected && styles.filterBadgeSelected]}>
                  <Text style={[styles.filterBadgeText, isSelected && styles.filterBadgeTextSelected]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Glowna lista gwarancji */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.document_id}
        renderItem={renderWarrantyCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>Brak pozycji na liście</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Brak paragonów spełniających kryteria wyszukiwania.'
                : 'Dodaj swój pierwszy paragon ze skanera, aby monitorować termin gwarancji.'}
            </Text>
            <TouchableOpacity
              style={styles.scanActionBtn}
              onPress={() => router.push('/scan')}
            >
              <Text style={styles.scanActionBtnText}>+ Zeskanuj paragon</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal zgloszenia reklamacji */}
      <Modal
        visible={claimModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Zgłoszenie reklamacyjne</Text>
            <Text style={styles.modalProduct}>{selectedItemForClaim?.title}</Text>
            <Text style={styles.modalDesc}>
              Wpisz notatkę (np. powód awarii, numer zgłoszenia u sprzedawcy lub datę oddania do serwisu):
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="np. Hałasujące łożysko, zgłoszenie #10492"
              placeholderTextColor="#64748B"
              value={claimNotes}
              onChangeText={setClaimNotes}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setClaimModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveClaim}>
                <Text style={styles.modalConfirmText}>Zapisz status</Text>
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
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#F8FAFC',
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: 10,
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  filterChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  filterBadgeSelected: {
    backgroundColor: '#0369A1',
  },
  filterBadgeText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  filterBadgeTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBadge: {
    color: '#94A3B8',
    fontSize: 11,
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  documentTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  amountText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'right',
  },
  datesGrid: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    color: '#64748B',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  dateValue: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  returnIcon: {
    fontSize: 12,
  },
  returnText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  returnActiveText: {
    color: '#10B981',
    fontWeight: '600',
  },
  returnExpiredText: {
    color: '#64748B',
  },
  claimNoteBox: {
    backgroundColor: '#1E1B4B',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  claimNoteLabel: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  claimNoteText: {
    color: '#E0E7FF',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginTop: 2,
  },
  claimBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  claimBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  restoreBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  restoreBtnText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  scanActionBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  scanActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modalProduct: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    height: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#0284C7',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
