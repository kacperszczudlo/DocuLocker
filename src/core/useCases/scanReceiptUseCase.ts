import { IOcrEngine } from '@/services/ocr/ocrEngine';
import { HeuristicReceiptParser } from '@/core/parsers/receiptParser';
import { ParsedReceiptData } from '@/core/parsers/types';

/**
 * Przypadek uzycia: Skanowanie i analiza paragonu (ScanReceiptUseCase).
 *
 * Koordynuje proces przetwarzania obrazu paragonu z wykorzystaniem
 * lokalnego silnika OCR oraz analizatora heurystycznego.
 */
export class ScanReceiptUseCase {
  /**
   * Tworzy instancje przypadku uzycia ze wstrzyknietym silnikiem OCR.
   *
   * @param ocrEngine Silnik realizujacy rozpoznawanie tekstu ze zdjecia.
   */
  constructor(private readonly ocrEngine: IOcrEngine) {}

  /**
   * Wykonuje pelny potok OCR oraz parsowania paragonu.
   *
   * @param imageUri Lokalny identyfikator URI wskazujacy plik ze zdjeciem.
   * @returns Ustrukturyzowane metadane paragonu z sugerowanym tytulem.
   */
  async execute(imageUri: string): Promise<ParsedReceiptData> {
    const ocrResult = await this.ocrEngine.recognizeText(imageUri);
    return HeuristicReceiptParser.parse(ocrResult);
  }
}
