import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '@/database/connection';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { CategoryRow, DocumentWithDetails } from '@/database/types';
import { colors, spacing, radii, typography, touchTargets, iconSizes, shadows, CATEGORY_ICON_MAP } from '@/theme/tokens';
import { BrandLogo } from '@/components/BrandLogo';

/**
 * Ekran główny Dashboard prezentujący statystyki bazy,
 * horyzontalną listę kategorii z prawdziwymi ikonami oraz zarejestrowane dokumenty.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const catRepo = new CategoryRepository(db);
      const docRepo = new DocumentRepository(db);

      const [cats, docs] = await Promise.all([
        catRepo.listCategories(),
        docRepo.listDocuments(selectedCategory),
      ]);

      setCategories(cats);
      setDocuments(docs);
    } catch (err) {
      console.error('[DocuLocker] Błąd ładowania danych dashboardu:', err);
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalSum = useMemo(() => {
    return documents.reduce((acc, doc) => acc + (doc.total_amount || 0), 0);
  }, [documents]);

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

  return (
    <View style={styles.container}>
      {/* Karta Statystyk i Bezpieczeństwa Sejfu */}
      <View style={styles.statsCard}>
        <View style={styles.statsCardLeft}>
          <View style={styles.vaultIconBadge}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primaryLight} />
          </View>
          <View style={styles.statsInfo}>
            <View style={styles.offlineStatusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statsLabel}>Lokalna Baza SQLite (Offline)</Text>
            </View>
            <Text style={styles.statsValue}>
              {documents.length} {documents.length === 1 ? 'paragon' : 'paragonów'} w sejfie
            </Text>
            {documents.length > 0 && (
              <Text style={styles.statsSubAmount}>
                Suma wydatków: <Text style={styles.amountHighlight}>{totalSum.toFixed(2)} PLN</Text>
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.quickAddBtn}
          onPress={() => router.push('/scan')}
          activeOpacity={touchTargets.activeOpacity}
          accessibilityRole="button"
          accessibilityLabel="Dodaj paragon do sejfu"
          hitSlop={touchTargets.minHitSlop}
        >
          <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.quickAddBtnText}>Dodaj</Text>
        </TouchableOpacity>
      </View>

      {/* Wybór kategorii */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="pricetags-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={styles.sectionTitle}>Kategorie</Text>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: -1, name: 'Wszystkie' }, ...categories]}
          keyExtractor={(item) => item.id.toString()}
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
                onPress={() => setSelectedCategory(isAll ? undefined : (isSelected ? undefined : item.id))}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel={`Kategoria ${item.name}`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={touchTargets.minHitSlop}
              >
                <Ionicons
                  name={meta.icon as any}
                  size={16}
                  color={meta.color}
                  style={styles.categoryChipIcon}
                />
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Lista dokumentów */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={styles.sectionTitle}>Zarejestrowane dokumenty</Text>
      </View>

      {documents.length === 0 ? (
        <View style={styles.emptyState}>
          <BrandLogo size={84} variant="lock" showBackground />
          <Text style={styles.emptyTitle}>Twój sejf jest pusty</Text>
          <Text style={styles.emptySubtext}>
            Zabezpiecz swoje paragony i faktury przed wyblaknięciem. Zrób zdjęcie aparatem — silnik Edge AI przetworzy dane w 100% lokalnie.
          </Text>

          <View style={styles.securityGuarantees}>
            <View style={styles.guaranteeRow}>
              <Ionicons name="lock-closed" size={16} color={colors.primaryLight} />
              <Text style={styles.guaranteeText}>100% Offline — brak zewnętrznych serwerów</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Ionicons name="hardware-chip-outline" size={16} color="#00B4D8" />
              <Text style={styles.guaranteeText}>Lokalne OCR Google ML Kit na urządzeniu</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Ionicons name="alarm-outline" size={16} color={colors.success} />
              <Text style={styles.guaranteeText}>Alerty o zbliżającym się końcu gwarancji</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => router.push('/scan')}
            activeOpacity={touchTargets.activeOpacity}
            accessibilityRole="button"
            accessibilityLabel="Zeskanuj pierwszy paragon"
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.emptyActionBtnText}>Zeskanuj pierwszy paragon</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.documentsList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const catMeta = getCategoryMeta(item.category_name);
            const isWarrantyActive = !!item.warranty_end_date && new Date(item.warranty_end_date) >= new Date();

            return (
              <TouchableOpacity
                style={styles.documentCard}
                activeOpacity={touchTargets.activeOpacity}
                onPress={() => router.push('/search')}
              >
                {/* Wektorowa ikona kategorii */}
                <View style={[styles.docCategoryIconBox, { backgroundColor: catMeta.bg }]}>
                  <Ionicons name={catMeta.icon as any} size={22} color={catMeta.color} />
                </View>

                {/* Środkowa zawartość */}
                <View style={styles.docLeft}>
                  <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
                  
                  <View style={styles.docMetaRow}>
                    {item.store_name ? (
                      <View style={styles.docStoreBadge}>
                        <Ionicons name="business-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                        <Text style={styles.docStoreText} numberOfLines={1}>{item.store_name}</Text>
                      </View>
                    ) : null}
                    
                    <View style={styles.docDateBadge}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
                      <Text style={styles.docDateText}>{item.purchase_date}</Text>
                    </View>
                  </View>

                  {item.warranty_end_date && (
                    <View style={[styles.warrantyPill, isWarrantyActive ? styles.warrantyPillActive : styles.warrantyPillExpired]}>
                      <Ionicons
                        name={isWarrantyActive ? 'shield-checkmark' : 'alert-circle'}
                        size={12}
                        color={isWarrantyActive ? colors.success : colors.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.docWarranty, isWarrantyActive ? styles.docWarrantyActive : styles.docWarrantyExpired]}>
                        Gwarancja do: {item.warranty_end_date}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Prawa strona - Kwota i strzałka */}
                <View style={styles.docRight}>
                  <Text style={styles.docAmount}>
                    {item.total_amount.toFixed(2)}
                  </Text>
                  <Text style={styles.docCurrency}>{item.currency}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Pływający przycisk akcji (FAB) zgodny z M3 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan')}
        activeOpacity={touchTargets.activeOpacity}
        accessibilityRole="button"
        accessibilityLabel="Zeskanuj paragon aparatem"
      >
        <Ionicons name="scan-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.fabText}>Skanuj paragon</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.subtle,
  },
  statsCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  vaultIconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  statsInfo: {
    flex: 1,
  },
  offlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statsLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  statsSubAmount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  amountHighlight: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  quickAddBtn: {
    backgroundColor: colors.primary,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    ...shadows.subtle,
  },
  quickAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 4,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  categoriesContainer: {
    maxHeight: 52,
    marginBottom: spacing.md,
  },
  categoriesList: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  categoryChipIcon: {
    marginRight: 6,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  documentsList: {
    paddingBottom: 96,
  },
  documentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.subtle,
  },
  docCategoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  docLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  docTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  docStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docStoreText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 130,
  },
  docDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docDateText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  warrantyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  warrantyPillActive: {
    backgroundColor: colors.successSubtle,
  },
  warrantyPillExpired: {
    backgroundColor: colors.expiredSubtle,
  },
  docWarranty: {
    fontSize: 11,
    fontWeight: '600',
  },
  docWarrantyActive: {
    color: colors.success,
  },
  docWarrantyExpired: {
    color: colors.textMuted,
  },
  docRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  docAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  docCurrency: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs + 2,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  securityGuarantees: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  guaranteeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
    minHeight: touchTargets.minHeight,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    ...shadows.medium,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
