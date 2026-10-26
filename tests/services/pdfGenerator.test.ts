import { describe, it, expect, beforeEach } from 'vitest';
import { PdfGenerator, ComplaintData, PrintDriver, SharingDriver } from '@/services/pdf/pdfGenerator';

class MockPrintDriver implements PrintDriver {
  public lastHtmlRendered: string = '';

  async printToFileAsync(options: { html: string }) {
    this.lastHtmlRendered = options.html;
    return { uri: 'file:///mock/storage/complaint_output.pdf' };
  }
}

class MockSharingDriver implements SharingDriver {
  public sharedUri: string | null = null;

  async isAvailableAsync() {
    return true;
  }

  async shareAsync(url: string) {
    this.sharedUri = url;
  }
}

describe('PdfGenerator Unit Tests', () => {
  let printDriver: MockPrintDriver;
  let sharingDriver: MockSharingDriver;
  let generator: PdfGenerator;

  const mockComplaint: ComplaintData = {
    documentId: 'doc-pdf-test-1',
    productTitle: 'Ekspres ciśnieniowy Philips LatteGo',
    storeName: 'MediaMarkt',
    storeTaxId: '5270008098',
    purchaseDate: '2026-05-10',
    totalAmount: 2199.99,
    currency: 'PLN',
    warrantyEndDate: '2028-05-10',
    consumerName: 'Jan Kowalski',
    consumerPhone: '+48 500 600 700',
    consumerEmail: 'jan.kowalski@example.com',
    consumerAddress: 'ul. Marszałkowska 10/4, 00-001 Warszawa',
    defectNoticeDate: '2026-10-25',
    defectDescription: 'Blok zaparzający nie pobiera wody, głośny stukot pompy.',
    consumerDemand: 'REPAIR',
    receiptImageUri: 'file:///app/receipts/doc-pdf-test-1.jpg',
  };

  beforeEach(() => {
    printDriver = new MockPrintDriver();
    sharingDriver = new MockSharingDriver();
    generator = new PdfGenerator(printDriver, sharingDriver);
  });

  it('renders valid HTML containing all legal and consumer fields', () => {
    const html = generator.generateHtmlTemplate(mockComplaint);

    expect(html).toContain('Zgłoszenie Reklamacyjne Towaru');
    expect(html).toContain('Ekspres ciśnieniowy Philips LatteGo');
    expect(html).toContain('MediaMarkt');
    expect(html).toContain('5270008098');
    expect(html).toContain('Jan Kowalski');
    expect(html).toContain('+48 500 600 700');
    expect(html).toContain('2199.99 PLN');
    expect(html).toContain('Nieodpłatna naprawa towaru');
    expect(html).toContain('Blok zaparzający nie pobiera wody');
    expect(html).toContain('file:///app/receipts/doc-pdf-test-1.jpg');
  });

  it('generates PDF file using print driver', async () => {
    const uri = await generator.generateComplaintPdf(mockComplaint);

    expect(uri).toBe('file:///mock/storage/complaint_output.pdf');
    expect(printDriver.lastHtmlRendered).toContain('Jan Kowalski');
  });

  it('generates and shares PDF via sharing driver', async () => {
    const uri = await generator.generateAndShareComplaintPdf(mockComplaint);

    expect(uri).toBe('file:///mock/storage/complaint_output.pdf');
    expect(sharingDriver.sharedUri).toBe(uri);
  });

  it('renders refund bank account when demand is REFUND', () => {
    const refundComplaint: ComplaintData = {
      ...mockComplaint,
      consumerDemand: 'REFUND',
      bankAccountNumber: 'PL 12 1020 3040 5060 7080 9000 0000',
    };

    const html = generator.generateHtmlTemplate(refundComplaint);
    expect(html).toContain('Odstąpienie od umowy i zwrot uiszczonej kwoty');
    expect(html).toContain('PL 12 1020 3040 5060 7080 9000 0000');
  });
});
