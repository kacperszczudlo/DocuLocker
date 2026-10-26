import { TextStyle } from 'react-native';

/**
 * DocuLocker Design System Tokens
 * Conforming to Google Material Design 3, Apple HIG 2025, and W3C WCAG 2.2 AA.
 * Based on 8pt Spatial Grid Architecture.
 */

export const colors = {
  // Tła i powierzchnie
  background: '#0F172A', // Slate 900
  surface: '#1E293B',    // Slate 800
  surfaceElevated: '#334155', // Slate 700
  surfaceSubtle: '#152033',

  // Krawędzie i podziały
  border: '#334155',
  borderLight: '#475569',
  borderFocused: '#38BDF8',

  // Typografia i kontrasty (WCAG 2.2 AA >= 4.5:1 against surfaces)
  textPrimary: '#F8FAFC',   // Slate 50 (Kontrast ~13:1 na Slate 800)
  textSecondary: '#94A3B8', // Slate 400 (Kontrast ~5.8:1 na Slate 800 - spełnia AA)
  textMuted: '#64748B',     // Slate 500 (Dla ikon i drugorzędnych etykiet)
  textInverse: '#0F172A',

  // Akcenty i akcje
  primary: '#0284C7',       // Sky 600
  primaryLight: '#38BDF8',  // Sky 400
  primaryDark: '#0369A1',   // Sky 700
  primarySubtle: 'rgba(2, 132, 199, 0.15)',

  // Statusy i semantyka
  success: '#10B981',       // Emerald 500 (Aktywna gwarancja)
  successSubtle: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',       // Amber 500 (Wygasająca wkrótce)
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',        // Red 500 (Błąd / termin minął)
  dangerSubtle: 'rgba(239, 68, 68, 0.15)',
  claimed: '#3B82F6',       // Blue 500 (W trakcie reklamacji)
  claimedSubtle: 'rgba(59, 130, 246, 0.15)',
  expired: '#64748B',       // Szary (Wygasła)
  expiredSubtle: 'rgba(100, 116, 139, 0.15)',
} as const;

export const spacing = {
  xs: 4,   // 0.5x
  sm: 8,   // 1x (Podstawa siatki 8pt)
  md: 16,  // 2x
  lg: 24,  // 3x
  xl: 32,  // 4x
  xxl: 48, // 6x
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const typography: Record<string, TextStyle> = {
  titleLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  numericBold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryLight,
  },
};

export const touchTargets = {
  minHeight: 48, // 48dp wg Google Material Design 3 i Apple HIG
  minHitSlop: {
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
  },
  activeOpacity: 0.7,
} as const;
