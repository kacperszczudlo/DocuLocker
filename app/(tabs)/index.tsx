import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDatabase } from '@/database/connection';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { CategoryRow, DocumentWithDetails } from '@/database/types';
import { colors, spacing, radii, typography, touchTargets } from '@/theme/tokens';

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
      console.error('[DocuLocker] Blad ladowania danych dashboardu:', err);
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={styles.container}>
      {/* Karta Statystyk Bazy */}
      <View style={styles.statsCard}>
        <View style={styles.statsInfo}>
          <Text style={styles.statsLabel}>Lokalna baza SQLite (Offline)</Text>
          <Text style={styles.statsValue}>{documents.length} dokumentów w sejfie</Text>
        </View>
        <TouchableOpacity
          style={styles.quickAddBtn}
          onPress={() => router.push('/scan')}
          activeOpacity={touchTargets.activeOpacity}
          accessibilityRole="button"
          accessibilityLabel="Szybkie skanowanie paragonu"
          hitSlop={touchTargets.minHitSlop}
        >
          <Text style={styles.quickAddBtnText}>+ Skanuj</Text>
        </TouchableOpacity>
      </View>

      {/* Wybór kategorii */}
      <Text style={styles.sectionTitle}>Kategorie</Text>
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(isSelected ? undefined : item.id)}
                activeOpacity={touchTargets.activeOpacity}
                accessibilityRole="button"
                accessibilityLabel={`Kategoria ${item.name}`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={touchTargets.minHitSlop}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Lista dokumentów */}
      <Text style={styles.sectionTitle}>Ostatnie dokumenty</Text>
      {documents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>Brak zapisanych paragonów</Text>
          <Text style={styles.emptySubtext}>
            Zrób zdjęcie paragonu aparatem lub wybierz z galerii, a sztuczna inteligencja ML Kit natychmiast odczyta dane bez wysyłania do chmury.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => router.push('/scan')}
            activeOpacity={touchTargets.activeOpacity}
            accessibilityRole="button"
            accessibilityLabel="Zeskanuj pierwszy paragon"
          >
            <Text style={styles.emptyActionBtnText}>Zeskanuj pierwszy paragon</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.documentsList}
          renderItem={({ item }) => (
            <View style={styles.documentCard}>
              <View style={styles.docLeft}>
                <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.docMeta}>
                  {item.purchase_date} {item.store_name ? `• ${item.store_name}` : ''}
                </Text>
                {item.warranty_end_date && (
                  <Text style={styles.docWarranty}>
                    🛡️ Gwarancja do: {item.warranty_end_date}
                  </Text>
                )}
              </View>
              <Text style={styles.docAmount}>
                {item.total_amount.toFixed(2)} {item.currency}
              </Text>
            </View>
          )}
        />
      )}

      {/* Pływający przycisk akcji (FAB) - min 48x48dp */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan')}
        activeOpacity={touchTargets.activeOpacity}
        accessibilityRole="button"
        accessibilityLabel="Zeskanuj paragon"
      >
        <Text style={styles.fabText}>+ Skanuj paragon</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  statsLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  quickAddBtn: {
    backgroundColor: colors.primary,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  quickAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  categoriesContainer: {
    maxHeight: 48,
    marginBottom: spacing.md,
  },
  categoriesList: {
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
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
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
    minHeight: touchTargets.minHeight,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  documentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  docLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  docTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  docMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  docWarranty: {
    color: colors.success,
    fontSize: 11,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  docAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryLight,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
