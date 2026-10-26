import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OcrRecognitionResult, OcrTextBlock } from '@/core/parsers/types';

export interface IOcrEngine {
  recognizeText(imageUri: string): Promise<OcrRecognitionResult>;
}

export class MlKitOcrEngine implements IOcrEngine {
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

export class MockOcrEngine implements IOcrEngine {
  constructor(private readonly mockResult: OcrRecognitionResult) {}

  async recognizeText(_imageUri: string): Promise<OcrRecognitionResult> {
    return this.mockResult;
  }
}
