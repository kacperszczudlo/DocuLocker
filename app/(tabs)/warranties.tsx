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
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '@/database/connection';
import { WarrantyRepository, WarrantyItemWithDetails, WarrantyStats } from '@/database/repositories/warrantyRepository';
import { WarrantyStatus } from '@/database/types';
import { colors, spacing, radii, typography, touchTargets, iconSizes, shadows } from '@/theme/tokens';
import { BrandLogo } from '@/components/BrandLogo';

type FilterTab = 'ALL' | WarrantyStatus;

const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'ALL', label: 'Wszystkie', icon: 'layers-outline' },
  { key: 'EXPIRING_SOON', label: 'Wygasające', icon: 'alert-circle' },
  { key: 'ACTIVE', label: 'Aktywne', icon: 'shield-checkmark' },
  { key: 'EXPIRED', label: 'Wygasłe', icon: 'time-outline' },
  { key: 'CLAIMED', label: 'Reklamowane', icon: 'construct' },
];

/**
 * Ekran zarządzania terminami rękojmi, gwarancji i zwrotów towaru.
 * Zbudowany z pełnym zestawem wektorowych ikon i architektury skali UI.
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

      // Synchronizacja statusów na bazie dzisiejszej daty
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
      console.error('[DocuLocker] Błąd podczas ładowania gwarancji:', err);
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
      console.error('[DocuLocker] Błąd zapisu reklamacji:', err);
      Alert.alert('Błąd', 'Nie udało się zaktualizować statusu reklamacji.');
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
      console.error('[DocuLocker] Błąd przywracania statusu:', err);
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

  const getStatusIcon = (status: WarrantyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'shield-checkmark';
      case 'EXPIRING_SOON':
        return 'alert-circle';
      case 'EXPIRED':
        return 'time-outline';
      case 'CLAIMED':
        return 'construct';
      default:
        return 'shield-outline';
    }
  };

  const renderWarrantyCard = ({ item }: { item: WarrantyItemWithDetails }) => {
    const calc = item.calculation;
    const statusIcon = getStatusIcon(item.status);

    return (
      <View style={styles.card}>
        {/* Nagłówek karty: sklep + odznaka statusu z ikoną */}
        <View style={styles.cardHeader}>
          <View style={styles.storeContainer}>
            <View style={styles.storeIconWrap}>
              <Ionicons name="business-outline" size={14} color={colors.primaryLight} />
            </View>
            <Text style={styles.storeName}>{item.store_name ?? 'Zakup ogólny'}</Text>
            {item.category_name && (
              <Text style={styles.categoryBadge}>{item.category_name}</Text>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${calc.badgeColor}18`, borderColor: calc.badgeColor }]}>
            <Ionicons name={statusIcon as any} size={13} color={calc.badgeColor} style={{ marginRight: 4 }} />
            <Text style={[styles.statusBadgeText, { color: calc.badgeColor }]}>
              {calc.badgeLabel}
            </Text>
          </View>
        </View>

        {/* Tytuł i kwota */}
        <View style={styles.titleRow}>
          <Text style={styles.documentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.amountText}>
            {item.total_amount.toFixed(2)} {item.currency}
          </Text>
        </View>

        {/* Pasek postępu gwarancji */}
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
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressText}>Upłynęło {calc.progressPercentage}% okresu</Text>
            {calc.daysRemaining > 0 && (
              <Text style={[styles.progressRemainingText, { color: calc.badgeColor }]}>
                Pozostało {calc.daysRemaining} dni
              </Text>
            )}
          </View>
        </View>

        {/* Sekcja szczegółów terminów */}
        <View style={styles.datesGrid}>
          <View style={styles.dateCol}>
            <View style={styles.dateHeaderRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.dateLabel}>Data Zakupu</Text>
            </View>
            <Text style={styles.dateValue}>{item.purchase_date}</Text>
          </View>

          <View style={styles.dateCol}>
            <View style={styles.dateHeaderRow}>
              <Ionicons name="shield-outline" size={13} color={calc.badgeColor} style={{ marginRight: 4 }} />
              <Text style={styles.dateLabel}>Koniec ochrony ({item.duration_months} m)</Text>
            </View>
            <Text style={[styles.dateValue, { color: calc.badgeColor, fontWeight: '700' }]}>
              {item.end_date}
            </Text>
          </View>
        </View>

        {/* Informacja o oknie zwrotu */}
        <View style={styles.returnRow}>
          <Ionicons
            name="return-up-back-outline"
            size={14}
            color={calc.returnStatus === 'CAN_RETURN' ? colors.success : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.returnText}>
            Ustawowy zwrot do: {item.return_deadline}{' '}
            {calc.returnStatus === 'CAN_RETURN' ? (
              <Text style={styles.returnActiveText}>(jeszcze {calc.returnDaysRemaining} dni)</Text>
            ) : (
              <Text style={styles.returnExpiredText}>(termin minął)</Text>
            )}
          </Text>
        </View>

        {/* Notatka reklamacyjna z pełnym tłem */}
        {item.claim_notes && (
          <View style={styles.claimNoteBox}>
            <View style={styles.claimNoteHeader}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={styles.claimNoteLabel}>Notatka serwisowa RMA:</Text>
            </View>
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
              accessibilityLabel="Zakończ proces reklamacji"
              hitSlop={touchTargets.minHitSlop}
            >
              <Ionicons name="checkmark-done" size={15} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.restoreBtnText}>Zakończ reklamację</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => handleOpenClaimModal(item)}
              activeOpacity={touchTargets.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel="Zgłoś usterkę lub reklamację"
              hitSlop={touchTargets.minHitSlop}
            >
              <Ionicons name="construct-outline" size={15} color={colors.primaryLight} style={{ marginRight: 6 }} />
              <Text style={styles.claimBtnText}>Zgłoś reklamację</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Pasek wyszukiwania z prawdziwą lupą */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj produktu, sklepu lub numeru..."
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
            accessibilityLabel="Wyczyść pole wyszukiwania"
          >
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Zakładki filtrów ze statusem i ikonami */}
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
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
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

      {/* Główna lista gwarancji */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.document_id}
        renderItem={renderWarrantyCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BrandLogo size={76} variant="shield" showBackground />
            <Text style={styles.emptyTitle}>Brak pozycji w tej kategorii</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Brak paragonów spełniających wybrane kryteria wyszukiwania.'
                : 'Zeskanuj paragon ze sklepu, a system automatycznie ustawi terminy ochrony i powiadomienia.'}
            </Text>
            <TouchableOpacity
              style={styles.scanActionBtn}
              onPress={() => router.push('/scan')}
              activeOpacity={touchTargets.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel="Zeskanuj paragon"
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.scanActionBtnText}>Zeskanuj paragon</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal zgłoszenia reklamacji */}
      <Modal
        visible={claimModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="construct" size={20} color={colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Zgłoszenie Reklamacyjne</Text>
                <Text style={styles.modalProduct} numberOfLines={1}>{selectedItemForClaim?.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setClaimModalVisible(false)}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Zanotuj opis usterki, numer zgłoszenia RMA w sklepie lub datę oddania do serwisu:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="np. Hałasujące łożysko, zgłoszenie RMA #10492 w Media Expert..."
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
                <Ionicons name="save-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
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
  clearSearchBtn: {
    padding: spacing.xs,
  },
  filtersContainer: {
    marginBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: 2,
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
    borderColor: colors.borderSubtle,
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
    marginLeft: 6,
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
    paddingBottom: spacing.xl + 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.subtle,
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
    gap: spacing.xs + 2,
    flex: 1,
    marginRight: spacing.sm,
  },
  storeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    color: colors.textPrimary,
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
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.md,
    lineHeight: 20,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
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
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  progressRemainingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  datesGrid: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dateCol: {
    flex: 1,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dateLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: colors.claimed,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  claimNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  claimNoteLabel: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  claimNoteText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  claimBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  restoreBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.success,
    flexDirection: 'row',
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
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  scanActionBtn: {
    backgroundColor: colors.primary,
    minHeight: touchTargets.minHeight,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    ...shadows.medium,
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
    borderColor: colors.borderSubtle,
    ...shadows.medium,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  modalProduct: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  modalDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: radii.md,
    padding: spacing.md,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    borderRadius: radii.md,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
