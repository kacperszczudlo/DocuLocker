import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/tokens';

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
