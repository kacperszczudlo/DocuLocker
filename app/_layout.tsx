import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '@/database/connection';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await getDatabase();
        setIsReady(true);
      } catch (err) {
        console.error('Blad inicjalizacji bazy danych:', err);
        setInitError(err instanceof Error ? err.message : 'Nieznany blad');
      }
    }
    prepare();
  }, []);

  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Blad startu aplikacji</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Ladowanie bazy danych DocuLocker...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 14,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#CBD5E1',
    textAlign: 'center',
    fontSize: 14,
  },
});
