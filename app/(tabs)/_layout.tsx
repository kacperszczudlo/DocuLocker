import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, iconSizes } from '@/theme/tokens';
import { BrandLogo } from '@/components/BrandLogo';

/**
 * TabLayout - Dolny pasek nawigacyjny aplikacji DocuLocker.
 *
 * Spełnia standardy Google Material Design 3 oraz Apple Human Interface Guidelines 2025:
 * - Minimalny touch target 48dp na kontrolkę
 * - Prawdziwe wektorowe ikony z wyraźnym stanem aktywnym i nieaktywnym
 * - Wbudowany wektorowy logotyp w nagłówku aplikacji
 * - Pełna obsługa Android Edge-to-Edge z dynamicznymi safe area insets
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const tabHeight = 60 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleAlign: 'left',
        tabBarStyle: {
          backgroundColor: '#0B1528', // Czysty deep navy zgodny z M3
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dokumenty',
          headerTitle: () => (
            <View style={styles.headerBrand}>
              <View style={styles.headerLogoBadge}>
                <BrandLogo size={24} variant="lock" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerAppTitle}>DocuLocker</Text>
                <Text style={styles.headerAppSubtitle}>Lokalny Sejf Dokumentów</Text>
              </View>
            </View>
          ),
          tabBarIcon: ({ color, focused, size }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={iconSizes.md}
                color={focused ? colors.primaryLight : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="warranties"
        options={{
          title: 'Gwarancje',
          headerTitle: () => (
            <View style={styles.headerBrand}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="shield-checkmark" size={18} color="#00B4D8" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerAppTitle}>Terminy Gwarancji</Text>
                <Text style={styles.headerAppSubtitle}>Rękojmia i Ochrona</Text>
              </View>
            </View>
          ),
          tabBarIcon: ({ color, focused, size }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <Ionicons
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
                size={iconSizes.md}
                color={focused ? colors.primaryLight : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Szukaj',
          headerTitle: () => (
            <View style={styles.headerBrand}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="search" size={18} color="#38BDF8" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerAppTitle}>Wyszukiwanie FTS5</Text>
                <Text style={styles.headerAppSubtitle}>Baza Pełnotekstowa</Text>
              </View>
            </View>
          ),
          tabBarIcon: ({ color, focused, size }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <Ionicons
                name={focused ? 'search' : 'search-outline'}
                size={iconSizes.md}
                color={focused ? colors.primaryLight : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ustawienia',
          headerTitle: () => (
            <View style={styles.headerBrand}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="shield" size={18} color="#10B981" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerAppTitle}>Ustawienia Sejfu</Text>
                <Text style={styles.headerAppSubtitle}>Zero-Data & Prywatność</Text>
              </View>
            </View>
          ),
          tabBarIcon: ({ color, focused, size }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={iconSizes.md}
                color={focused ? colors.primaryLight : color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  headerLogoBadge: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerAppTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  headerAppSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    height: 28,
    borderRadius: radii.xl,
  },
  activePill: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
  },
});
