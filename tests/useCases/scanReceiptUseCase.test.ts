import { describe, it, expect } from 'vitest';
import { ScanReceiptUseCase } from '@/core/useCases/scanReceiptUseCase';
import { MockOcrEngine } from '@/services/ocr/ocrEngine';

describe('ScanReceiptUseCase', () => {
  it('coordinates OCR engine and heuristic parser successfully', async () => {
    const mockEngine = new MockOcrEngine({
      fullText: 'BIEDRONKA\nCHLEB 4.20\nSUMA PLN 4,20\nDATA 2026-10-23',
      blocks: [],
      processingTimeMs: 85,
    });

    const useCase = new ScanReceiptUseCase(mockEngine);
    const result = await useCase.execute('file://mock-path/receipt.jpg');

    expect(result.storeName).toBe('Biedronka');
    expect(result.totalAmount?.amount).toBe(4.2);
    expect(result.totalAmount?.currency).toBe('PLN');
    expect(result.purchaseDate?.isoDate).toBe('2026-10-23');
    expect(result.suggestedTitle).toContain('Biedronka');
    expect(result.suggestedCategoryName).toBe('Inne');
    expect(result.suggestedReturnDays).toBe(14);
  });
});
