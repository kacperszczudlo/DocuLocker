import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/tokens';

/**
 * TabLayout - Dolny pasek nawigacyjny aplikacji DocuLocker.
 *
 * Konfiguruje cztery glowne widoki:
 * 1. Dokumenty (index) - lista sejfu, filtry kategorii, podsumowanie wydatkow.
 * 2. Gwarancje (warranties) - os czasu, alerty wygasania (30/14/7 dni), statusy ochrony.
 * 3. Szukaj (search) - pelnotekstowe wyszukiwanie SQLite FTS5 z eksportem PDF.
 * 4. Ustawienia (settings) - audyt prywatnosci Zero-Data, kopie zapasowe, test powiadomien.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dokumenty',
          headerTitle: 'DocuLocker',
        }}
      />
      <Tabs.Screen
        name="warranties"
        options={{
          title: 'Gwarancje',
          headerTitle: 'Terminy Gwarancji',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Szukaj',
          headerTitle: 'Wyszukiwanie FTS5',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ustawienia',
          headerTitle: 'Ustawienia Sejfu',
        }}
      />
    </Tabs>
  );
}
