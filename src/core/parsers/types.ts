export interface OcrTextBlock {
  readonly text: string;
  readonly lines: readonly string[];
}

export interface OcrRecognitionResult {
  readonly fullText: string;
  readonly blocks: readonly OcrTextBlock[];
  readonly processingTimeMs: number;
}

export interface ParsedAmount {
  readonly amount: number;
  readonly currency: string;
  readonly confidence: number;
}

export interface ParsedDate {
  readonly isoDate: string; // YYYY-MM-DD
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
