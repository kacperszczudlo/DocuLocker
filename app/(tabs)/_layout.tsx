import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F8FAFC',
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
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
