import { describe, it, expect } from 'vitest';
import { HeuristicReceiptParser } from '@/core/parsers/receiptParser';
import { OcrRecognitionResult } from '@/core/parsers/types';

function createMockOcrResult(lines: string[]): OcrRecognitionResult {
  return {
    fullText: lines.join('\n'),
    blocks: [
      {
        text: lines.join('\n'),
        lines,
      },
    ],
    processingTimeMs: 120,
  };
}

describe('HeuristicReceiptParser - Total Amount Extraction', () => {
  it('extracts amount with SUMA PLN keyword and comma decimal', () => {
    const ocr = createMockOcrResult([
      'BIEDRONKA',
      'MASLO EKSTRA 7.99',
      'CHLEB 4.50',
      'SUMA PLN 12,49',
      'ROZLICZENIE PLATNOSCI',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.totalAmount).not.toBeNull();
    expect(result.totalAmount?.amount).toBe(12.49);
    expect(result.totalAmount?.currency).toBe('PLN');
    expect(result.totalAmount?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('extracts amount with RAZEM keyword and dot decimal', () => {
    const ocr = createMockOcrResult([
      'LIDL SP. Z O.O.',
      'KAWA ZIARNISTA 49.99',
      'RAZEM: 49.99 PLN',
      'KARTA PLATNICZA',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.totalAmount?.amount).toBe(49.99);
    expect(result.totalAmount?.currency).toBe('PLN');
  });

  it('extracts amount with space thousand separator and zl symbol', () => {
    const ocr = createMockOcrResult([
      'MEDIA MARKT POLSKA',
      'TELEWIZOR OLED 55',
      'SUMA DO ZAPLATY: 3 499,00 zł',
      'PODSUMOWANIE FISKALNE',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.totalAmount?.amount).toBe(3499.0);
    expect(result.totalAmount?.currency).toBe('PLN');
  });

  it('extracts amount in EUR currency', () => {
    const ocr = createMockOcrResult([
      'SUPERMARKET BERLIN',
      'MINERALWASSER 1.50',
      'TOTAL: € 24.50',
      'VIELEN DANK',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.totalAmount?.amount).toBe(24.5);
    expect(result.totalAmount?.currency).toBe('EUR');
  });

  it('extracts amount with PLATNOSC KARTA without SUMA keyword', () => {
    const ocr = createMockOcrResult([
      'SKLEP SPOZYWCZY',
      'JABLKA 5.50',
      'PLATNOSC KARTA 5,50',
      'NR TRANSAKCJI 4920',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.totalAmount?.amount).toBe(5.5);
  });

  it('returns null when text does not contain any recognizable amount', () => {
    const ocr = createMockOcrResult([
      'NIEWYRAZNY TEKST',
      'BLEDNY WYDRUK',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.totalAmount).toBeNull();
  });
});

describe('HeuristicReceiptParser - Purchase Date Extraction', () => {
  it('extracts date in YYYY-MM-DD format', () => {
    const ocr = createMockOcrResult([
      'ROSSMANN SDP SP. Z O.O.',
      'DATA: 2026-10-22 14:35',
      'PARAGON FISKALNY',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.purchaseDate).not.toBeNull();
    expect(result.purchaseDate?.isoDate).toBe('2026-10-22');
  });

  it('extracts date in DD.MM.YYYY format', () => {
    const ocr = createMockOcrResult([
      'CASTORAMA POLSKA',
      '22.10.2026 R.',
      'KASA 04 KIEROWNIK',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.purchaseDate?.isoDate).toBe('2026-10-22');
  });

  it('extracts date in DD-MM-YYYY format with prefix SPRZEDAZ', () => {
    const ocr = createMockOcrResult([
      'IKEA RETAIL',
      'DATA SPRZEDAZY: 15-05-2025',
      'SUMA PLN 340,00',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.purchaseDate?.isoDate).toBe('2025-05-15');
  });

  it('extracts date with slashes YYYY/MM/DD', () => {
    const ocr = createMockOcrResult([
      'ZABKA POLSKA',
      '2026/01/05 08:12',
      'SUMA 15,00',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.purchaseDate?.isoDate).toBe('2026-01-05');
  });

  it('ignores invalid dates like 99-99-9999', () => {
    const ocr = createMockOcrResult([
      'BLEDNY DOKUMENT',
      'KOD 99-99-9999',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.purchaseDate).toBeNull();
  });
});

describe('HeuristicReceiptParser - Store and Tax ID Extraction', () => {
  it('detects known store brand from header lines', () => {
    const ocr = createMockOcrResult([
      'JERONIMO MARTINS POLSKA S.A.',
      'BIEDRONKA NR 1422',
      'UL. KRAKOWSKA 10, WARSZAWA',
      'NIP 779-10-11-327',
      'SUMA PLN 45,90',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.storeName).toBe('Biedronka');
    expect(result.detectedTaxId).toBe('7791011327');
    expect(result.suggestedTitle).toContain('Biedronka');
  });

  it('detects NIP without dashes', () => {
    const ocr = createMockOcrResult([
      'RTV EURO AGD',
      'EURO-NET SP. Z O.O.',
      'NIP: 5270005984',
      'SUMA PLN 199,00',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.storeName).toBe('RTV Euro AGD');
    expect(result.detectedTaxId).toBe('5270005984');
  });

  it('uses unknown header as store name in suggested title', () => {
    const ocr = createMockOcrResult([
      'LOKALNA KAWIARNIA',
      'KAWA CZARNA 12.00',
      'SUMA PLN 12,00',
      '2026-10-20',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.storeName).toBe('LOKALNA KAWIARNIA');
    expect(result.suggestedTitle).toBe('Zakup: LOKALNA KAWIARNIA (12.00 PLN)');
    expect(result.suggestedCategoryName).toBeNull();
  });

  it('detects Action store brand with standalone ACTION header', () => {
    const ocr = createMockOcrResult([
      'ACTION',
      'ACTION POLSKA SP. Z O.O.',
      'UL. ROZDZIENSKIEGO 12',
      'NIP 676-24-91-827',
      'BATERIE AA 14.99',
      'SUMA PLN 14,99',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.storeName).toBe('Action');
    expect(result.detectedTaxId).toBe('6762491827');
  });

  it('extracts date in 2-digit year format DD-MM-YY', () => {
    const ocr = createMockOcrResult([
      'ACTION',
      'DATA 23-10-26 18:25',
      'SUMA PLN 29,99',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.purchaseDate?.isoDate).toBe('2026-10-23');
  });

  it('detects known store when brand appears below the first 10 header lines', () => {
    const ocr = createMockOcrResult([
      'PARAGON FISKALNY',
      'UL. DLUGA 1',
      'MIASTO',
      'KASA 01',
      'KASJER JAN',
      'NR WYDRUKU 12',
      'GODZINA 10:00',
      'TERMINAL 3',
      'LINIA 9',
      'LINIA 10',
      'MEDIA MARKT POLSKA',
      'SUMA PLN 199,00',
      '2026-10-20',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.storeName).toBe('MediaMarkt');
    expect(result.suggestedCategoryName).toBe('Elektronika i RTV');
    expect(result.suggestedReturnDays).toBe(30);
  });

  it('detects store despite OCR digit substitutions in brand name', () => {
    const ocr = createMockOcrResult([
      'B1EDR0NKA NR 88',
      'NIP 779-10-11-327',
      'SUMA PLN 12,00',
      '2026-10-21',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.storeName).toBe('Biedronka');
    expect(result.suggestedCategoryName).toBe('Inne');
    expect(result.suggestedReturnDays).toBe(14);
  });

  it('falls back to cleaned header line when brand is unknown', () => {
    const ocr = createMockOcrResult([
      'PARAGON FISKALNY',
      'Kawiarnia Zielona',
      'KAWA 12.00',
      'SUMA PLN 12,00',
      '2026-10-20',
    ]);

    const result = HeuristicReceiptParser.parse(ocr);
    expect(result.storeName).toBe('Kawiarnia Zielona');
    expect(result.suggestedCategoryName).toBeNull();
    expect(result.suggestedReturnDays).toBeNull();
  });
});
