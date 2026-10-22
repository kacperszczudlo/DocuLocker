# Kontrakty Interfejsów i Serwisów Wewnętrznych

Aplikacja DocuLocker nie korzysta z zewnętrznego API sieciowego. Dokument ten definiuje kontrakty wewnętrzne (interfejsy serwisów i repozytoriów) zapewniające separację logiki od modułów natywnych systemu Android.

## 1. Moduł OCR i analiza tekstu

### Interfejs silnika OCR (IOcrEngine)

```typescript
export interface OcrTextBlock {
  readonly text: string;
  readonly lines: readonly string[];
}

export interface OcrRecognitionResult {
  readonly fullText: string;
  readonly blocks: readonly OcrTextBlock[];
  readonly processingTimeMs: number;
}

export interface IOcrEngine {
  recognizeText(imageUri: string): Promise<OcrRecognitionResult>;
}
```

### Interfejs parsera paragonów (IReceiptParser)

```typescript
export interface ParsedAmount {
  readonly amount: number;
  readonly currency: string;
  readonly confidence: number;
}

export interface ParsedDate {
  readonly isoDate: string; // Format YYYY-MM-DD
  readonly confidence: number;
}

export interface ParsedReceiptData {
  readonly suggestedTitle: string;
  readonly storeName: string | null;
  readonly totalAmount: ParsedAmount | null;
  readonly purchaseDate: ParsedDate | null;
  readonly detectedTaxId: string | null;
  readonly rawText: string;
}

export interface IReceiptParser {
  parse(ocrResult: OcrRecognitionResult): ParsedReceiptData;
}
```

## 2. Repozytorium bazy danych (IDocumentRepository)

```typescript
export interface CreateDocumentInput {
  readonly title: string;
  readonly storeId?: number | null;
  readonly categoryId?: number | null;
  readonly totalAmount: number;
  readonly currency?: string;
  readonly purchaseDate: string; // YYYY-MM-DD
  readonly documentType?: 'RECEIPT' | 'INVOICE' | 'CONTRACT' | 'OTHER';
  readonly notes?: string;
  readonly rawOcrText?: string;
  readonly imageFilePath: string;
  readonly warrantyMonths?: number;
  readonly returnWindowDays?: number;
}

export interface DocumentFilter {
  readonly categoryId?: number;
  readonly storeId?: number;
  readonly query?: string;
  readonly onlyActiveWarranties?: boolean;
}

export interface DocumentSummary {
  readonly id: string;
  readonly title: string;
  readonly storeName: string | null;
  readonly totalAmount: number;
  readonly currency: string;
  readonly purchaseDate: string;
  readonly warrantyEndDate: string | null;
  readonly warrantyStatus: string | null;
  readonly imageFilePath: string | null;
}

export interface IDocumentRepository {
  createDocument(input: CreateDocumentInput): Promise<string>;
  getDocumentById(id: string): Promise<DocumentSummary | null>;
  listDocuments(filter?: DocumentFilter): Promise<readonly DocumentSummary[]>;
  searchFullText(query: string): Promise<readonly DocumentSummary[]>;
  updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}
```

## 3. Harmonogram powiadomień (IWarrantyScheduler)

```typescript
export interface ScheduleAlertInput {
  readonly documentId: string;
  readonly documentTitle: string;
  readonly alertDate: Date;
  readonly alertType: 'WARRANTY_30_DAYS' | 'WARRANTY_7_DAYS' | 'RETURN_WINDOW';
}

export interface IWarrantyScheduler {
  scheduleWarrantyAlert(input: ScheduleAlertInput): Promise<string>;
  cancelAlertsForDocument(documentId: string): Promise<void>;
  reconcileAlerts(): Promise<void>;
}
```

## 4. Eksport raportu reklamacyjnego (IPdfGenerator)

```typescript
export interface WarrantyReportOptions {
  readonly document: DocumentSummary;
  readonly issueDescription?: string;
}

export interface IPdfGenerator {
  generateWarrantyReport(options: WarrantyReportOptions): Promise<string>;
  sharePdf(pdfPath: string): Promise<void>;
}
```
