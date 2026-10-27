import { TextStyle, ViewStyle } from 'react-native';

/**
 * DocuLocker Design System Tokens
 * Conforming to Google Material Design 3, Apple HIG 2025, and W3C WCAG 2.2 AA.
 * Based on 8pt Spatial Grid Architecture.
 */

export const colors = {
  // Tła i powierzchnie
  background: '#0F172A', // Slate 900
  surface: '#1E293B',    // Slate 800
  surfaceElevated: '#24334A', // Zoptymalizowany dla lepszego kontrastu kart
  surfaceSubtle: '#152033',

  // Krawędzie i podziały
  border: '#334155',
  borderLight: '#475569',
  borderFocused: '#38BDF8',
  borderSubtle: '#22344D',

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

  // Kolory brandowe wektorowe (zgodne z koncepcja ikony DocuLocker)
  brandNavy: '#0B1938',
  brandElectricBlue: '#007BFF',
  brandTeal: '#00B4D8',
  brandCyan: '#06B6D4',

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

/**
 * Standardowa skala ikon wedlug Google M3 i Apple HIG:
 * 16 (inline), 20 (kompaktowe), 24 (standard UI), 32 (akcenty kart), 48 (hero/puste stany)
 */
export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
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
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
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

export const shadows = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  floating: {
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  } as ViewStyle,
};

/**
 * Konfiguracja ikon i kolorów akcentu dla kategorii dokumentów
 */
export const CATEGORY_ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  'Elektronika': {
    icon: 'laptop-outline',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.15)',
  },
  'AGD': {
    icon: 'home-outline',
    color: '#00B4D8',
    bg: 'rgba(0, 180, 216, 0.15)',
  },
  'Odzież i Obuwie': {
    icon: 'shirt-outline',
    color: '#F472B6',
    bg: 'rgba(244, 114, 182, 0.15)',
  },
  'Dom i Ogród': {
    icon: 'leaf-outline',
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.15)',
  },
  'Motoryzacja': {
    icon: 'car-sport-outline',
    color: '#FB923C',
    bg: 'rgba(251, 146, 60, 0.15)',
  },
  'Zdrowie i Uroda': {
    icon: 'medkit-outline',
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.15)',
  },
  'Inne': {
    icon: 'receipt-outline',
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.15)',
  },
};
