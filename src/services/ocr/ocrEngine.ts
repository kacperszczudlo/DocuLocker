import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OcrRecognitionResult, OcrTextBlock } from '@/core/parsers/types';

/** Zunifikowany interfejs silnika optycznego rozpoznawania znakow (OCR). */
export interface IOcrEngine {
  /**
   * Rozpoznaje tekst ze zdjecia wskazanego przez lokalny URI.
   *
   * @param imageUri Sciezka do pliku graficznego.
   * @returns Pelny wynik ekstrakcji blokow tekstowych.
   */
  recognizeText(imageUri: string): Promise<OcrRecognitionResult>;
}

/**
 * Natywny silnik OCR oparty o Google ML Kit (MlKitOcrEngine).
 * Dziala w pelni na urzadzeniu (On-Device Edge AI) bez zewnetrznych polaczen sieciowych.
 */
export class MlKitOcrEngine implements IOcrEngine {
  /**
   * Wykonuje analize obrazu przy uzyciu natywnego modelu detekcji tekstu ML Kit.
   *
   * @param imageUri Sciezka do pliku graficznego paragonu.
   * @returns Skonsolidowany tekst wraz ze statystykami czasu przetwarzania.
   */
  async recognizeText(imageUri: string): Promise<OcrRecognitionResult> {
    const startTime = Date.now();

    try {
      const result = await TextRecognition.recognize(imageUri);

      const blocks: OcrTextBlock[] = (result.blocks || []).map((block) => ({
        text: block.text,
        lines: (block.lines || []).map((line) => line.text),
      }));

      return {
        fullText: result.text || '',
        blocks,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      console.error('[DocuLocker] Blad rozpoznawania tekstu ML Kit:', err);
      return {
        fullText: '',
        blocks: [],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }
}

/**
 * Deterministyczny silnik OCR (MockOcrEngine) przeznaczony do testow jednostkowych i integracyjnych.
 */
export class MockOcrEngine implements IOcrEngine {
  /**
   * Tworzy instancje atrapowa ze zdefiniowanym z gory wynikiem rozpoznania.
   *
   * @param mockResult Oczekiwany rezultat zwracany przez metode rozpoznawania.
   */
  constructor(private readonly mockResult: OcrRecognitionResult) {}

  /**
   * Zwraca predefiniowany wynik testowy bez interakcji z natywnym subsystemem.
   *
   * @param _imageUri URI zdjecia (ignorowany w mocku).
   */
  async recognizeText(_imageUri: string): Promise<OcrRecognitionResult> {
    return this.mockResult;
  }
}
