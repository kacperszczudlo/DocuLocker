import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '@/database/connection';
import { setupNotificationChannels } from '@/services/notifications/notificationService';
import * as SplashScreen from 'expo-splash-screen';
import { colors, spacing, typography, radii } from '@/theme/tokens';
import { BrandLogo } from '@/components/BrandLogo';
import { Ionicons } from '@expo/vector-icons';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Główny układ nawigacyjny aplikacji (RootLayout).
 *
 * Spełnia standardy Google Material Design 3 oraz Apple Human Interface Guidelines 2025:
 * - Brandowany ekran ładowania z wektorowym emblematem Option 1
 * - Czyste animacje i bezpieczna inicjalizacja bazy SQLite i kanałów powiadomień
 * - Precyzyjny nagłówek modalnego skanowania paragonu
 */
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await getDatabase();
        await setupNotificationChannels();
        setIsReady(true);
        await SplashScreen.hideAsync();
      } catch (err) {
        console.error('[DocuLocker] Błąd inicjalizacji bazy danych:', err);
        setInitError(err instanceof Error ? err.message : 'Nieznany błąd');
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconCircle}>
          <Ionicons name="alert-circle" size={44} color={colors.danger} />
        </View>
        <Text style={styles.errorTitle}>Błąd startu aplikacji</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centerContainer}>
        <BrandLogo size={72} variant="lock" showBackground />
        <Text style={styles.loadingBrandName}>DocuLocker</Text>
        <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginTop: spacing.md }} />
        <Text style={styles.loadingText}>Inicjalizacja bezpiecznej bazy SQLite...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="scan"
          options={{
            headerShown: true,
            title: 'Nowy Paragon w Sejfie',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
            },
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingBrandName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.md,
    letterSpacing: 0.5,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontSize: 13,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.dangerSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
