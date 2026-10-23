import { OcrRecognitionResult, OcrTextBlock } from '@/core/parsers/types';

export interface IOcrEngine {
  recognizeText(imageUri: string): Promise<OcrRecognitionResult>;
}

export class MlKitOcrEngine implements IOcrEngine {
  async recognizeText(imageUri: string): Promise<OcrRecognitionResult> {
    const startTime = Date.now();

    try {
      // Dynamiczny import natywnego modulu Google ML Kit
      const TextRecognition = (await import('@react-native-ml-kit/text-recognition')).default;
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
      // W srodowisku bez dostepu do sprzetowego aparatu/NPU (np. symulator, testy)
      console.warn('MlKit native module unavailable, returning empty OCR result:', err);
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
