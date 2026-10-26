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
import { colors, spacing, radii, typography, touchTargets } from '@/theme/tokens';

type FilterTab = 'ALL' | WarrantyStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Wszystkie' },
  { key: 'EXPIRING_SOON', label: 'Wygasajace' },
  { key: 'ACTIVE', label: 'Aktywne' },
  { key: 'EXPIRED', label: 'Wygasle' },
  { key: 'CLAIMED', label: 'Reklamowane' },
];

/**
 * Ekran zarzadzania terminami rekojmi, gwarancji i zwrotow towaru.
 * Umozliwia filtrowanie wedlug statusow oraz rejestracje notatek serwisowych.
 */
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
      Alert.alert('Zapisano', 'Status zmieniony na "W trakcie reklamacji".');
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
      Alert.alert('Sukces', 'Przywrocono standardowy status ochrony.');
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
          <View style={[styles.statusBadge, { backgroundColor: `${calc.badgeColor}20`, borderColor: calc.badgeColor }]}>
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
          <Text style={styles.progressText}>{calc.progressPercentage}% okresu uplynelo</Text>
        </View>

        {/* Sekcja szczegolow terminow */}
        <View style={styles.datesGrid}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Data Zakupu</Text>
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
          <Text style={styles.returnText}>
            Termin zwrotu: {item.return_deadline}{' '}
            {calc.returnStatus === 'CAN_RETURN' ? (
              <Text style={styles.returnActiveText}>(jeszcze {calc.returnDaysRemaining} dni)</Text>
            ) : (
              <Text style={styles.returnExpiredText}>(termin minal)</Text>
            )}
          </Text>
        </View>

        {/* Notatka reklamacyjna z pelnym tlem */}
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
              activeOpacity={touchTargets.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel="Zakoncz proces reklamacji"
              hitSlop={touchTargets.minHitSlop}
            >
              <Text style={styles.restoreBtnText}>Zakoncz reklamacje</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => handleOpenClaimModal(item)}
              activeOpacity={touchTargets.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel="Zglos usterke lub reklamacje"
              hitSlop={touchTargets.minHitSlop}
            >
              <Text style={styles.claimBtnText}>Zglos reklamacje</Text>
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
        <Text style={styles.headerTitle}>Straznik Gwarancji</Text>
        <Text style={styles.headerSubtitle}>
          Lokalny rejestr terminow rekojmi i zwrotow
        </Text>
      </View>

      {/* Pasek wyszukiwania */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj produktu lub sklepu..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityRole="search"
          accessibilityLabel="Szukaj w gwarancjach"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
            hitSlop={touchTargets.minHitSlop}
            accessibilityRole="button"
            accessibilityLabel="Wyczysc pole wyszukiwania"
          >
            <Text style={styles.clearSearchText}>Wyczysc</Text>
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
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel={`Filtr ${item.label}, ${count} pozycji`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={touchTargets.minHitSlop}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Brak pozycji na liscie</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Brak paragonow spelniajacych wybrane kryteria wyszukiwania.'
                : 'Zeskanuj paragon ze sklepu, aby monitorowac termin uplywu rekojmi.'}
            </Text>
            <TouchableOpacity
              style={styles.scanActionBtn}
              onPress={() => router.push('/scan')}
              activeOpacity={touchTargets.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel="Zeskanuj paragon"
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
            <Text style={styles.modalTitle}>Zgloszenie reklamacyjne</Text>
            <Text style={styles.modalProduct}>{selectedItemForClaim?.title}</Text>
            <Text style={styles.modalDesc}>
              Wpisz notatke (np. opis usterki, numer RMA ze sklepu lub date przekazania do serwisu):
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="np. Halasujace lozysko, zgloszenie serwisowe #10492"
              placeholderTextColor={colors.textMuted}
              value={claimNotes}
              onChangeText={setClaimNotes}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setClaimModalVisible(false)}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel="Anuluj"
              >
                <Text style={styles.modalCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveClaim}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel="Zapisz status reklamacji"
              >
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.textPrimary,
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: spacing.sm,
  },
  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filtersContainer: {
    marginBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  filterBadgeSelected: {
    backgroundColor: colors.primaryDark,
  },
  filterBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterBadgeTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  storeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  storeName: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBadge: {
    color: colors.textSecondary,
    fontSize: 11,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
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
    marginBottom: spacing.sm,
  },
  documentTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.md,
    lineHeight: 20,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'right',
  },
  datesGrid: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateValue: {
    color: colors.textPrimary,
    fontSize: 12,
  },
  returnRow: {
    marginBottom: spacing.sm,
  },
  returnText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  returnActiveText: {
    color: colors.success,
    fontWeight: '600',
  },
  returnExpiredText: {
    color: colors.textMuted,
  },
  claimNoteBox: {
    backgroundColor: colors.claimedSubtle,
    borderWidth: 1,
    borderColor: colors.claimed,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  claimNoteLabel: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  claimNoteText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  claimBtn: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  restoreBtn: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtnText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  scanActionBtn: {
    backgroundColor: colors.primary,
    minHeight: touchTargets.minHeight,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
  },
  scanActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  modalProduct: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  modalInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: radii.sm,
    padding: spacing.md,
    height: 96,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalCancelBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
