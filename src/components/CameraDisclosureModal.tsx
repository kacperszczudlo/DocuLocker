import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, touchTargets, shadows } from '@/theme/tokens';

export const CAMERA_DISCLOSURE_TEXT = {
  title: 'Wymagany dostęp do aparatu',
  description:
    'DocuLocker potrzebuje dostępu do aparatu wyłącznie w celu wykonania zdjęcia paragonu lub faktury. Odczyt danych i rozpoznawanie tekstu (OCR) odbywa się w 100% lokalnie na procesorze Twojego telefonu.',
  zeroDataNotice:
    'Zgodnie z zasadą Zero-Data, żadne zdjęcia, kwoty ani dane zakupowe nie są przesyłane do chmury ani podmiotów zewnętrznych.',
  acceptButton: 'Rozumiem, przejdź do aparatu',
  declineButton: 'Nie teraz',
};

export interface CameraDisclosureModalProps {
  readonly visible: boolean;
  readonly onAccept: () => void;
  readonly onDecline: () => void;
}

/**
 * Modal informacyjny (Prominent In-App Disclosure) wymagany przez Google Play Developer Policy.
 * Wyświetlany przed wywołaniem systemowego okna uprawnień aparatu na urządzeniach Android.
 */
export function CameraDisclosureModal({ visible, onAccept, onDecline }: CameraDisclosureModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <Ionicons name="camera-outline" size={32} color={colors.primaryLight} />
          </View>

          <Text style={styles.title}>{CAMERA_DISCLOSURE_TEXT.title}</Text>
          <Text style={styles.description}>{CAMERA_DISCLOSURE_TEXT.description}</Text>

          <View style={styles.zeroDataBox}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={styles.zeroDataText}>{CAMERA_DISCLOSURE_TEXT.zeroDataNotice}</Text>
          </View>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
            activeOpacity={touchTargets.activeOpacity}
            accessibilityRole="button"
            accessibilityLabel={CAMERA_DISCLOSURE_TEXT.acceptButton}
          >
            <Text style={styles.acceptButtonText}>{CAMERA_DISCLOSURE_TEXT.acceptButton}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            activeOpacity={touchTargets.activeOpacity}
            accessibilityRole="button"
            accessibilityLabel={CAMERA_DISCLOSURE_TEXT.declineButton}
          >
            <Text style={styles.declineButtonText}>{CAMERA_DISCLOSURE_TEXT.declineButton}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    ...shadows.medium,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  zeroDataBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  zeroDataText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  acceptButton: {
    width: '100%',
    minHeight: touchTargets.minHeight,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  declineButton: {
    width: '100%',
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
