import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Dane formularza zgloszenia reklamacyjnego z tytulu rekojmi
 * generowane na podstawie art. 556 i nast. Kodeksu Cywilnego.
 */
export interface ComplaintData {
  readonly documentId: string;
  readonly productTitle: string;
  readonly storeName: string;
  readonly storeTaxId?: string | null;
  readonly purchaseDate: string;
  readonly totalAmount: number;
  readonly currency: string;
  readonly warrantyEndDate?: string | null;
  readonly receiptImageUri?: string | null;

  // Dane konsumenta wprowadzane w formularzu eksportu
  readonly consumerName: string;
  readonly consumerPhone?: string;
  readonly consumerEmail?: string;
  readonly consumerAddress?: string;

  // Opis wady i zadanie
  readonly defectNoticeDate: string;
  readonly defectDescription: string;
  readonly consumerDemand: 'REPAIR' | 'REPLACEMENT' | 'PRICE_REDUCTION' | 'REFUND';
  readonly bankAccountNumber?: string;
}

export interface PrintDriver {
  printToFileAsync(options: { html: string; width?: number; height?: number }): Promise<{ uri: string }>;
}

export interface SharingDriver {
  isAvailableAsync(): Promise<boolean>;
  shareAsync(url: string, options?: { mimeType?: string; dialogTitle?: string }): Promise<void>;
}

/**
 * Generator dokumentow reklamacyjnych PDF (PdfGenerator).
 *
 * Odpowiada za:
 * - Przygotowanie estetycznego, znormalizowanego szablonu HTML pisma reklamacyjnego.
 * - Osadzenie skanu lub zdjecia paragonu bezposrednio w tresci dokumentu.
 * - Konwersje HTML do formatu PDF za pomoca natywnego silnika wydruku Androida.
 * - Bezposrednie wywolanie arkusza udostepniania w celu wyslania PDF mailem lub komunikatorem.
 */
export class PdfGenerator {
  constructor(
    private readonly printDriver: PrintDriver = Print,
    private readonly sharingDriver: SharingDriver = Sharing
  ) {}

  /**
   * Generuje szablon HTML dla wniosku reklamacyjnego
   */
  generateHtmlTemplate(data: ComplaintData): string {
    const demandLabels: Record<ComplaintData['consumerDemand'], string> = {
      REPAIR: 'Nieodpłatna naprawa towaru (usunięcie wady)',
      REPLACEMENT: 'Wymiana towaru na nowy, wolny od wad',
      PRICE_REDUCTION: 'Obniżenie ceny towaru',
      REFUND: 'Odstąpienie od umowy i zwrot uiszczonej kwoty',
    };

    const selectedDemandText = demandLabels[data.consumerDemand] || 'Nieodpłatna naprawa towaru';

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Zgloszenie Reklamacyjne - ${data.productTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #1e293b;
      line-height: 1.5;
      font-size: 13px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .header-table td {
      vertical-align: top;
      width: 50%;
    }
    .box-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .box-content {
      font-size: 13px;
      color: #0f172a;
    }
    .main-title {
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 10px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .legal-basis {
      text-align: center;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 25px;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-header {
      font-size: 13px;
      font-weight: 700;
      color: #0369a1;
      border-bottom: 1.5px solid #0284c7;
      padding-bottom: 4px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .details-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .details-table td.label {
      width: 35%;
      background-color: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    .demand-box {
      background-color: #f0fdf4;
      border: 1.5px solid #22c55e;
      padding: 12px;
      border-radius: 6px;
      font-weight: 600;
      color: #15803d;
      margin-top: 6px;
    }
    .receipt-container {
      margin-top: 25px;
      page-break-before: auto;
      text-align: center;
    }
    .receipt-img {
      max-width: 90%;
      max-height: 420px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .signature-grid {
      width: 100%;
      margin-top: 40px;
      border-collapse: collapse;
    }
    .signature-grid td {
      width: 50%;
      text-align: center;
      padding: 20px;
    }
    .signature-line {
      border-bottom: 1px dashed #94a3b8;
      height: 40px;
      margin-bottom: 6px;
    }
    .footer {
      margin-top: 30px;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- Naglowek: Strony -->
  <table class="header-table">
    <tr>
      <td>
        <div class="box-title">Konsument (Zgłaszający):</div>
        <div class="box-content">
          <strong>${data.consumerName}</strong><br />
          ${data.consumerAddress ? `${data.consumerAddress}<br />` : ''}
          ${data.consumerPhone ? `Tel: ${data.consumerPhone}<br />` : ''}
          ${data.consumerEmail ? `Email: ${data.consumerEmail}` : ''}
        </div>
      </td>
      <td style="text-align: right;">
        <div class="box-title">Sprzedawca (Adresat):</div>
        <div class="box-content">
          <strong>${data.storeName}</strong><br />
          ${data.storeTaxId ? `NIP: ${data.storeTaxId}<br />` : ''}
          Data zgłoszenia: <strong>${new Date().toISOString().slice(0, 10)}</strong>
        </div>
      </td>
    </tr>
  </table>

  <!-- Tytul dokumentu -->
  <div class="main-title">Zgłoszenie Reklamacyjne Towaru</div>
  <div class="legal-basis">
    Wniosek z tytułu niezgodności towaru z umową / rękojmi konsumenckiej (Ustawa o prawach konsumenta z dnia 30 maja 2014 r.)
  </div>

  <!-- Przedmiot reklamacji -->
  <div class="section">
    <div class="section-header">1. Informacje o zakupionym towarze</div>
    <table class="details-table">
      <tr>
        <td class="label">Nazwa / Opis towaru:</td>
        <td><strong>${data.productTitle}</strong></td>
      </tr>
      <tr>
        <td class="label">Miejsce zakupu (Sklep):</td>
        <td>${data.storeName}</td>
      </tr>
      <tr>
        <td class="label">Data zakupu:</td>
        <td>${data.purchaseDate}</td>
      </tr>
      <tr>
        <td class="label">Cena zakupu brutto:</td>
        <td>${data.totalAmount.toFixed(2)} ${data.currency}</td>
      </tr>
      ${data.warrantyEndDate ? `
      <tr>
        <td class="label">Termin upływu ochrony:</td>
        <td>${data.warrantyEndDate}</td>
      </tr>` : ''}
    </table>
  </div>

  <!-- Opis wady -->
  <div class="section">
    <div class="section-header">2. Opis stwierdzonej wady</div>
    <table class="details-table">
      <tr>
        <td class="label">Data ujawnienia wady:</td>
        <td>${data.defectNoticeDate}</td>
      </tr>
      <tr>
        <td class="label">Szczegółowy opis wady:</td>
        <td style="white-space: pre-wrap; line-height: 1.6;">${data.defectDescription}</td>
      </tr>
    </table>
  </div>

  <!-- Zadanie konsumenta -->
  <div class="section">
    <div class="section-header">3. Żądanie konsumenta</div>
    <div class="demand-box">
      Wybrane żądanie: ${selectedDemandText}
    </div>
    ${data.consumerDemand === 'REFUND' || data.consumerDemand === 'PRICE_REDUCTION' ? `
      <p style="margin-top: 8px; font-size: 12px; color: #475569;">
        W przypadku zwrotu środków proszę o przekazanie kwoty na rachunek bankowy:<br />
        <strong>${data.bankAccountNumber || 'Podany podczas bezpośredniej korespondencji'}</strong>
      </p>
    ` : ''}
  </div>

  <!-- Podpisy -->
  <table class="signature-grid">
    <tr>
      <td>
        <div class="signature-line"></div>
        <div style="font-size: 11px; color: #64748b;">Miejscowość, Data</div>
      </td>
      <td>
        <div class="signature-line"></div>
        <div style="font-size: 11px; color: #64748b;">Podpis Konsumenta</div>
      </td>
    </tr>
  </table>

  <!-- Zalacznik: Zdjecie paragonu jesli dostepne -->
  ${data.receiptImageUri ? `
    <div class="receipt-container">
      <div class="section-header" style="text-align: left;">Załącznik: Dowód Zakupu (Paragon / Faktura)</div>
      <img class="receipt-img" src="${data.receiptImageUri}" alt="Dowód zakupu" />
    </div>
  ` : ''}

  <div class="footer">
    Dokument wygenerowany w aplikacji <strong>DocuLocker</strong> - Bezpieczny Sejf Paragonów (Offline-First Edge AI)
  </div>

</body>
</html>
    `.trim();
  }

  /**
   * Generuje plik PDF i zwraca jego lokalny URI
   */
  async generateComplaintPdf(data: ComplaintData): Promise<string> {
    const html = this.generateHtmlTemplate(data);
    const result = await this.printDriver.printToFileAsync({ html });
    return result.uri;
  }

  /**
   * Generuje plik PDF oraz otwiera natywne okno udostepniania systemu Android
   */
  async generateAndShareComplaintPdf(data: ComplaintData): Promise<string> {
    const pdfUri = await this.generateComplaintPdf(data);

    const isAvailable = await this.sharingDriver.isAvailableAsync();
    if (isAvailable) {
      await this.sharingDriver.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Zgłoszenie reklamacyjne - ${data.productTitle}`,
      });
    }

    return pdfUri;
  }
}
