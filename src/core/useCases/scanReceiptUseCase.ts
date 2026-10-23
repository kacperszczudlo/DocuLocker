import { IOcrEngine } from '@/services/ocr/ocrEngine';
import { HeuristicReceiptParser } from '@/core/parsers/receiptParser';
import { ParsedReceiptData } from '@/core/parsers/types';

export class ScanReceiptUseCase {
  constructor(private readonly ocrEngine: IOcrEngine) {}

  async execute(imageUri: string): Promise<ParsedReceiptData> {
    const ocrResult = await this.ocrEngine.recognizeText(imageUri);
    return HeuristicReceiptParser.parse(ocrResult);
  }
}
