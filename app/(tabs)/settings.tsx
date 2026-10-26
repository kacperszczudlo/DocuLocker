import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radii, touchTargets } from '@/theme/tokens';

/**
 * Ekran ustawien oraz informacji o architekturze bezpieczenstwa i parametrach prawnych.
 */
export default function SettingsScreen() {
  const handlePrivacyInfo = () => {
    Alert.alert(
      'Manifest Prywatnosci Zero-Data',
      'DocuLocker nie posiada serwera ani konta w chmurze. Wszystkie Twoje paragony, zdjecia, notatki oraz kwoty sa szyfrowane w piaskownicy Twojego urzadzenia i nigdy go nie opuszczaja.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Karta Manifestu Zero-Data */}
      <View style={styles.manifestCard}>
        <Text style={styles.manifestTitle}>Manifest Zero-Data</Text>
        <Text style={styles.manifestText}>
          Dane finansowe i paragony naleza wylacznie do Ciebie. DocuLocker dziala w 100% w trybie offline: brak serwerow posredniczacych, brak subskrypcji i brak telemetrii.
        </Text>
        <TouchableOpacity
          style={styles.manifestBtn}
          onPress={handlePrivacyInfo}
          activeOpacity={touchTargets.activeOpacity}
          accessibilityRole="button"
          accessibilityLabel="Szczegoly ochrony danych"
        >
          <Text style={styles.manifestBtnText}>Szczegoly ochrony danych</Text>
        </TouchableOpacity>
      </View>

      {/* Sekcja Architektury */}
      <Text style={styles.sectionHeader}>Architektura Bezpieczenstwa</Text>
      <View style={styles.card}>
        <View style={styles.itemRow}>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Lokalny magazyn SQLite</Text>
            <Text style={styles.itemDesc}>Indeksacja FTS5, relacyjna baza bez dostepu do sieci</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Edge AI OCR (Google ML Kit)</Text>
            <Text style={styles.itemDesc}>Rozpoznawanie tekstu odbywa sie lokalnie na procesorze telefonu</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Lokalne alarmy Androida</Text>
            <Text style={styles.itemDesc}>Powiadomienia na 30 i 7 dni przed uplywem gwarancji</Text>
          </View>
        </View>
      </View>

      {/* Domyslne Parametry */}
      <Text style={styles.sectionHeader}>Parametry Prawne</Text>
      <View style={styles.card}>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Standardowa rekojmia konsumencka:</Text>
          <Text style={styles.paramValue}>24 miesiace</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Ustawowe okno zwrotu:</Text>
          <Text style={styles.paramValue}>14 dni</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Godzina porannych powiadomien:</Text>
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
          <Text style={styles.paramValue}>SQLite FTS5 (Schema v1)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Srodowisko:</Text>
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
