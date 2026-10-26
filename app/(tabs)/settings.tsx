import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radii, typography, touchTargets } from '@/theme/tokens';

export default function SettingsScreen() {
  const handlePrivacyInfo = () => {
    Alert.alert(
      'Manifest Prywatności Zero-Data',
      'DocuLocker nie posiada serwera ani konta w chmurze. Wszystkie Twoje paragony, zdjęcia, notatki oraz kwoty są szyfrowane w piaskownicy Twojego urządzenia i nigdy go nie opuszczają.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Karta Manifestu Zero-Data */}
      <View style={styles.manifestCard}>
        <Text style={styles.manifestIcon}>🛡️</Text>
        <Text style={styles.manifestTitle}>Manifest Zero-Data & Anti-Cloud</Text>
        <Text style={styles.manifestText}>
          Twoje dane finansowe i paragony należą wyłącznie do Ciebie. DocuLocker działa w 100% w trybie offline — brak serwerów pośredniczących, brak subskrypcji i brak śledzenia.
        </Text>
        <TouchableOpacity
          style={styles.manifestBtn}
          onPress={handlePrivacyInfo}
          activeOpacity={touchTargets.activeOpacity}
          accessibilityRole="button"
          accessibilityLabel="Więcej informacji o prywatności"
        >
          <Text style={styles.manifestBtnText}>Szczegóły ochrony danych</Text>
        </TouchableOpacity>
      </View>

      {/* Sekcja Architektury */}
      <Text style={styles.sectionHeader}>Architektura Bezpieczeństwa</Text>
      <View style={styles.card}>
        <View style={styles.itemRow}>
          <Text style={styles.itemIcon}>💾</Text>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Lokalny magazyn SQLite</Text>
            <Text style={styles.itemDesc}>Indeksacja FTS5, relacyjna baza bez dostępu do sieci</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemIcon}>🧠</Text>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Edge AI OCR (Google ML Kit)</Text>
            <Text style={styles.itemDesc}>Rozpoznawanie tekstu odbywa się lokalnie na procesorze telefonu</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <Text style={styles.itemIcon}>🔔</Text>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Lokalne alarmy Androida</Text>
            <Text style={styles.itemDesc}>Powiadomienia na 30 i 7 dni przed upływem gwarancji</Text>
          </View>
        </View>
      </View>

      {/* Domyślne Parametry */}
      <Text style={styles.sectionHeader}>Parametry Prawne i Ochrony</Text>
      <View style={styles.card}>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Standardowa rękojmia konsumencka:</Text>
          <Text style={styles.paramValue}>24 miesiące</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Ustawowe okno zwrotu:</Text>
          <Text style={styles.paramValue}>14 dni</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Godzina porannych powiadomień:</Text>
          <Text style={styles.paramValue}>10:00</Text>
        </View>
      </View>

      {/* O Aplikacji */}
      <Text style={styles.sectionHeader}>O Aplikacji</Text>
      <View style={styles.card}>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Wersja:</Text>
          <Text style={styles.paramValue}>0.1.0 (Developer Build)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Silnik bazy:</Text>
          <Text style={styles.paramValue}>SQLite + FTS5 (Schema v1)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Środowisko:</Text>
          <Text style={styles.paramValue}>React Native / Expo SDK 54</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  manifestCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  manifestIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  manifestTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  manifestText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  manifestBtn: {
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  manifestBtnText: {
    color: colors.primaryLight,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  itemIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  paramLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  paramValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
