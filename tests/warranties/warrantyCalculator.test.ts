import { describe, it, expect } from 'vitest';
import {
  WarrantyCalculator,
  formatDaysRemaining,
  addMonthsToIsoDate,
  addDaysToIsoDate,
  diffDays,
} from '@/core/warranties/warrantyCalculator';

describe('WarrantyCalculator - Helper Date Functions', () => {
  it('adds months to date correctly across calendar years', () => {
    expect(addMonthsToIsoDate('2026-01-15', 24)).toBe('2028-01-15');
    expect(addMonthsToIsoDate('2026-10-26', 12)).toBe('2027-10-26');
  });

  it('handles leap year and end of month boundaries', () => {
    // 31 stycznia + 1 miesiac = 28 lub 29 lutego
    expect(addMonthsToIsoDate('2024-01-31', 1)).toBe('2024-02-29'); // 2024 byl przestepny
    expect(addMonthsToIsoDate('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('adds days correctly to date', () => {
    expect(addDaysToIsoDate('2026-10-01', 14)).toBe('2026-10-15');
    expect(addDaysToIsoDate('2026-10-25', 10)).toBe('2026-11-04');
  });

  it('computes difference in days accurately', () => {
    expect(diffDays('2026-10-01', '2026-10-15')).toBe(14);
    expect(diffDays('2026-10-15', '2026-10-01')).toBe(-14);
    expect(diffDays('2026-10-26', '2026-10-26')).toBe(0);
  });

  it('formats remaining and elapsed days in Polish correctly', () => {
    expect(formatDaysRemaining(0)).toBe('Wygasa dzisiaj');
    expect(formatDaysRemaining(1)).toBe('Pozostał 1 dzień');
    expect(formatDaysRemaining(3)).toBe('Pozostały 3 dni');
    expect(formatDaysRemaining(20)).toBe('Pozostało 20 dni');
    expect(formatDaysRemaining(-1)).toBe('Wygasła wczoraj');
    expect(formatDaysRemaining(-5)).toBe('Wygasła 5 dni temu');
  });
});

describe('WarrantyCalculator - Status Determination', () => {
  it('marks warranty as ACTIVE when remaining days > 30', () => {
    const ref = new Date('2026-10-26T12:00:00Z');
    const result = WarrantyCalculator.calculate({
      purchaseDate: '2026-01-01',
      durationMonths: 24, // do 2028-01-01
      referenceDate: ref,
    });

    expect(result.status).toBe('ACTIVE');
    expect(result.badgeColor).toBe('#10B981');
    expect(result.daysRemaining).toBeGreaterThan(30);
    expect(result.badgeLabel).toContain('Aktywna');
  });

  it('marks warranty as EXPIRING_SOON when remaining days <= 30 and >= 0', () => {
    const ref = new Date('2026-10-26T12:00:00Z');
    // Zakup 2024-11-10 + 24 m-ce = 2026-11-10 (za 15 dni)
    const result = WarrantyCalculator.calculate({
      purchaseDate: '2024-11-10',
      durationMonths: 24,
      referenceDate: ref,
    });

    expect(result.status).toBe('EXPIRING_SOON');
    expect(result.badgeColor).toBe('#F59E0B');
    expect(result.daysRemaining).toBe(15);
    expect(result.badgeLabel).toBe('Pozostało 15 dni');
  });

  it('marks warranty as EXPIRED when remaining days < 0', () => {
    const ref = new Date('2026-10-26T12:00:00Z');
    // Zakup 2024-10-01 + 24 m-ce = 2026-10-01 (wygasla 25 dni temu)
    const result = WarrantyCalculator.calculate({
      purchaseDate: '2024-10-01',
      durationMonths: 24,
      referenceDate: ref,
    });

    expect(result.status).toBe('EXPIRED');
    expect(result.badgeColor).toBe('#64748B');
    expect(result.daysRemaining).toBe(-25);
    expect(result.badgeLabel).toBe('Wygasła 25 dni temu');
  });

  it('marks warranty as CLAIMED when isClaimed is true', () => {
    const ref = new Date('2026-10-26T12:00:00Z');
    const result = WarrantyCalculator.calculate({
      purchaseDate: '2026-01-01',
      durationMonths: 24,
      isClaimed: true,
      referenceDate: ref,
    });

    expect(result.status).toBe('CLAIMED');
    expect(result.badgeColor).toBe('#3B82F6');
    expect(result.badgeLabel).toBe('W trakcie reklamacji');
  });

  it('calculates return window status correctly', () => {
    const ref = new Date('2026-10-26T12:00:00Z');

    // Zakup przedwczoraj: 14 dni okna zwrotu
    const fresh = WarrantyCalculator.calculate({
      purchaseDate: '2026-10-24',
      returnWindowDays: 14,
      referenceDate: ref,
    });
    expect(fresh.returnStatus).toBe('CAN_RETURN');
    expect(fresh.returnDaysRemaining).toBe(12);

    // Zakup miesiac temu
    const old = WarrantyCalculator.calculate({
      purchaseDate: '2026-09-01',
      returnWindowDays: 14,
      referenceDate: ref,
    });
    expect(old.returnStatus).toBe('RETURN_EXPIRED');
    expect(old.returnDaysRemaining).toBeLessThan(0);
  });
});
