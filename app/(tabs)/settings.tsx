import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, touchTargets, iconSizes, shadows } from '@/theme/tokens';
import { BrandLogo } from '@/components/BrandLogo';

/**
 * Ekran ustawień oraz informacji o architekturze bezpieczeństwa i parametrach prawnych.
 * Zaprojektowany z pełną wektorową oprawą graficzną i architekturą skali UI.
 */
export default function SettingsScreen() {
  const handlePrivacyInfo = () => {
    Alert.alert(
      'Manifest Prywatności Zero-Data',
      'DocuLocker nie posiada zewnętrznego serwera ani konta w chmurze.\n\nWszystkie Twoje paragony, zdjęcia, odczyty OCR oraz kwoty są przechowywane wyłącznie w lokalnej bazie SQLite w piaskownicy Twojego telefonu.\n\nŻadne dane analityczne ani telemetria nie są wysyłane przez sieć.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Karta Manifestu Zero-Data z logotypem wektorowym */}
      <View style={styles.manifestCard}>
        <BrandLogo size={68} variant="shield" showBackground />
        <Text style={styles.manifestTitle}>Manifest Zero-Data</Text>
        <Text style={styles.manifestText}>
          Twoje paragony i dane zakupowe należą wyłącznie do Ciebie. DocuLocker działa w 100% lokalnie i bez dostępu do sieci.
        </Text>

        <View style={styles.pillsRow}>
          <View style={styles.badgePill}>
            <Ionicons name="shield-checkmark" size={13} color={colors.success} style={{ marginRight: 4 }} />
            <Text style={styles.badgePillText}>100% Offline</Text>
          </View>
          <View style={styles.badgePill}>
            <Ionicons name="eye-off-outline" size={13} color="#38BDF8" style={{ marginRight: 4 }} />
            <Text style={styles.badgePillText}>Zero Telemetrii</Text>
          </View>
          <View style={styles.badgePill}>
            <Ionicons name="lock-closed-outline" size={13} color="#00B4D8" style={{ marginRight: 4 }} />
            <Text style={styles.badgePillText}>Piaskownica</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.manifestBtn}
          onPress={handlePrivacyInfo}
          activeOpacity={touchTargets.activeOpacity}
          accessibilityRole="button"
          accessibilityLabel="Szczegóły ochrony danych"
          hitSlop={touchTargets.minHitSlop}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.primaryLight} style={{ marginRight: 6 }} />
          <Text style={styles.manifestBtnText}>Szczegóły ochrony danych</Text>
        </TouchableOpacity>
      </View>

      {/* Sekcja Architektury z prawdziwymi ikonami */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="hardware-chip-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={styles.sectionHeader}>Architektura Bezpieczeństwa</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.itemRow}>
          <View style={[styles.itemIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
            <Ionicons name="server-outline" size={20} color={colors.primaryLight} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Lokalny magazyn SQLite</Text>
            <Text style={styles.itemDesc}>Indeksacja FTS5, relacyjna baza bez dostępu do internetu</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <View style={[styles.itemIconBox, { backgroundColor: 'rgba(0, 180, 216, 0.15)' }]}>
            <Ionicons name="scan-outline" size={20} color="#00B4D8" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Edge AI OCR (Google ML Kit)</Text>
            <Text style={styles.itemDesc}>Rozpoznawanie tekstu odbywa się lokalnie na NPU/CPU telefonu</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.itemRow}>
          <View style={[styles.itemIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.success} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Lokalne alarmy systemowe</Text>
            <Text style={styles.itemDesc}>Powiadomienia na 30 i 7 dni przed upływem gwarancji</Text>
          </View>
        </View>
      </View>

      {/* Domyślne Parametry */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="scale-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={styles.sectionHeader}>Parametry Prawne i Ustawienia</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.paramRow}>
          <View style={styles.paramLeft}>
            <Ionicons name="shield-outline" size={16} color={colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={styles.paramLabel}>Standardowa rękojmia konsumencka:</Text>
          </View>
          <Text style={styles.paramValue}>24 miesiące</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <View style={styles.paramLeft}>
            <Ionicons name="return-up-back-outline" size={16} color="#38BDF8" style={{ marginRight: 8 }} />
            <Text style={styles.paramLabel}>Ustawowe okno zwrotu:</Text>
          </View>
          <Text style={styles.paramValue}>14 dni</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <View style={styles.paramLeft}>
            <Ionicons name="alarm-outline" size={16} color={colors.warning} style={{ marginRight: 8 }} />
            <Text style={styles.paramLabel}>Godzina porannych powiadomień:</Text>
          </View>
          <Text style={styles.paramValue}>10:00</Text>
        </View>
      </View>

      {/* O Aplikacji */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={styles.sectionHeader}>O Aplikacji</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.paramRow}>
          <View style={styles.paramLeft}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.paramLabel}>Wersja:</Text>
          </View>
          <Text style={styles.paramValue}>0.1.0 (Mobile Secure Build)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <View style={styles.paramLeft}>
            <Ionicons name="layers-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.paramLabel}>Silnik bazy:</Text>
          </View>
          <Text style={styles.paramValue}>SQLite FTS5 (Schema v1)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.paramRow}>
          <View style={styles.paramLeft}>
            <Ionicons name="code-slash-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.paramLabel}>Środowisko:</Text>
          </View>
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
    paddingBottom: spacing.xxl + 20,
  },
  manifestCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    ...shadows.medium,
  },
  manifestTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  manifestText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
    maxWidth: 320,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  badgePillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  manifestBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  manifestBtnText: {
    color: colors.primaryLight,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  itemDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  paramLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
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
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
});
