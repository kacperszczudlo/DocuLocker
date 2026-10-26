import { describe, it, expect } from 'vitest';
import { colors, spacing, radii, touchTargets } from '@/theme/tokens';

describe('Design Tokens System Architecture', () => {
  it('conforms to 8pt spatial grid architecture', () => {
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing.xxl).toBe(48);

    // Kazdy kluczowy krok spacingu (poza xs = 4) jest wielokrotnoscia 8
    expect(spacing.sm % 8).toBe(0);
    expect(spacing.md % 8).toBe(0);
    expect(spacing.lg % 8).toBe(0);
    expect(spacing.xl % 8).toBe(0);
    expect(spacing.xxl % 8).toBe(0);
  });

  it('enforces 48dp minimum touch target size according to M3 & HIG', () => {
    expect(touchTargets.minHeight).toBeGreaterThanOrEqual(48);
    expect(touchTargets.minHitSlop.top).toBeGreaterThanOrEqual(8);
    expect(touchTargets.minHitSlop.bottom).toBeGreaterThanOrEqual(8);
    expect(touchTargets.minHitSlop.left).toBeGreaterThanOrEqual(8);
    expect(touchTargets.minHitSlop.right).toBeGreaterThanOrEqual(8);
  });

  it('defines distinct contrast tokens for accessibility', () => {
    expect(colors.background).toBe('#0F172A');
    expect(colors.surface).toBe('#1E293B');
    expect(colors.textPrimary).toBe('#F8FAFC');
    expect(colors.textSecondary).toBe('#94A3B8');
    expect(colors.primary).toBe('#0284C7');
    expect(colors.success).toBe('#10B981');
    expect(colors.warning).toBe('#F59E0B');
  });
});
