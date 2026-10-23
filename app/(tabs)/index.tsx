import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDatabase } from '@/database/connection';
import { CategoryRepository } from '@/database/repositories/categoryRepository';
import { DocumentRepository } from '@/database/repositories/documentRepository';
import { CategoryRow, DocumentWithDetails } from '@/database/types';

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
      console.error('Blad ladowania danych dashboardu:', err);
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={styles.container}>
      <View style={styles.statsCard}>
        <View>
          <Text style={styles.statsLabel}>Lokalna baza SQLite (Offline)</Text>
          <Text style={styles.statsValue}>{documents.length} dokumentow w sejfie</Text>
        </View>
        <TouchableOpacity style={styles.quickAddBtn} onPress={() => router.push('/scan')}>
          <Text style={styles.quickAddBtnText}>+ Skanuj</Text>
        </TouchableOpacity>
      </View>

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
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <Text style={styles.sectionTitle}>Ostatnie dokumenty</Text>
      {documents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Brak zapisanych paragonow.</Text>
          <Text style={styles.emptySubtext}>
            Zrob zdjecie paragonu aparatem lub wybierz z galerii, a sztuczna inteligencja ML Kit odczyta dane.
          </Text>
          <TouchableOpacity style={styles.emptyActionBtn} onPress={() => router.push('/scan')}>
            <Text style={styles.emptyActionBtnText}>Zeskanuj pierwszy paragon</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.documentCard}>
              <View style={styles.docLeft}>
                <Text style={styles.docTitle}>{item.title}</Text>
                <Text style={styles.docMeta}>
                  {item.purchase_date} {item.store_name ? `• ${item.store_name}` : ''}
                </Text>
                {item.warranty_end_date && (
                  <Text style={styles.docWarranty}>
                    Gwarancja do: {item.warranty_end_date}
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Skanuj paragon</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  statsValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  quickAddBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  categoriesContainer: {
    maxHeight: 46,
    marginBottom: 16,
  },
  categoriesList: {
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  categoryText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#0284C7',
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  documentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  docLeft: {
    flex: 1,
    marginRight: 12,
  },
  docTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '500',
  },
  docMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  docWarranty: {
    color: '#34D399',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  docAmount: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
