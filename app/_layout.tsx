import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '@/database/connection';
import * as SplashScreen from 'expo-splash-screen';
import { colors, spacing, typography } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Glowny uklad nawigacyjny aplikacji (RootLayout).
 *
 * Odpowiada za:
 * - Blokowanie automatycznego ukrywania Splash Screena do czasu zakonczenia bootstrapu.
 * - Inicjalizacje bazy danych SQLite (migracje, triggery FTS5, indeksy).
 * - Renderowanie fallbacku ladowania oraz obslugi krytycznych bledow startowych.
 * - Definicje glownego stosu nawigacyjnego (Stack) z ekranami modalnymi.
 */
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await getDatabase();
        setIsReady(true);
        await SplashScreen.hideAsync();
      } catch (err) {
        console.error('[DocuLocker] Blad inicjalizacji bazy danych:', err);
        setInitError(err instanceof Error ? err.message : 'Nieznany blad');
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Błąd startu aplikacji</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Ładowanie bazy danych DocuLocker...</Text>
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
            title: 'Dodaj paragon',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
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
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
