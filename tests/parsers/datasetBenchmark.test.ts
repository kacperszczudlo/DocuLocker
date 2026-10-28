import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { HeuristicReceiptParser } from '@/core/parsers/receiptParser';
import { OcrRecognitionResult } from '@/core/parsers/types';

interface GroundTruthCase {
  id: string;
  category: string;
  store: string;
  rawLines: string[];
  expected: {
    storeName: string;
    totalAmount: number;
    currency: string;
    purchaseDate: string;
    taxId: string | null;
    categoryName?: string;
    returnDays?: number;
  };
}

interface GroundTruthDataset {
  version: string;
  description: string;
  cases: GroundTruthCase[];
}

function createOcrResult(lines: string[]): OcrRecognitionResult {
  return {
    fullText: lines.join('\n'),
    blocks: [
      {
        text: lines.join('\n'),
        lines,
      },
    ],
    processingTimeMs: 15,
  };
}

describe('DocuLocker Automated Dataset Benchmark', () => {
  const datasetPath = path.resolve(__dirname, '../../test_dataset/ground_truth.json');

  it('runs benchmark across ground_truth.json test cases and evaluates accuracy', () => {
    expect(fs.existsSync(datasetPath)).toBe(true);
    const content = fs.readFileSync(datasetPath, 'utf-8');
    const dataset: GroundTruthDataset = JSON.parse(content);

    let storeMatches = 0;
    let amountMatches = 0;
    let dateMatches = 0;
    let taxIdMatches = 0;
    const totalCases = dataset.cases.length;

    expect(totalCases).toBeGreaterThan(0);

    for (const testCase of dataset.cases) {
      const ocrResult = createOcrResult(testCase.rawLines);
      const parsed = HeuristicReceiptParser.parse(ocrResult);

      const storeOk = parsed.storeName?.toLowerCase().includes(testCase.expected.storeName.toLowerCase()) ?? false;
      const amountOk = parsed.totalAmount?.amount === testCase.expected.totalAmount;
      const dateOk = parsed.purchaseDate?.isoDate === testCase.expected.purchaseDate;
      const taxIdOk = parsed.detectedTaxId === testCase.expected.taxId;

      if (storeOk) storeMatches++;
      if (amountOk) amountMatches++;
      if (dateOk) dateMatches++;
      if (taxIdOk) taxIdMatches++;

      expect(parsed.totalAmount?.amount).toBe(testCase.expected.totalAmount);
      expect(parsed.purchaseDate?.isoDate).toBe(testCase.expected.purchaseDate);
      expect(parsed.detectedTaxId).toBe(testCase.expected.taxId);
    }

    const storeAcc = (storeMatches / totalCases) * 100;
    const amountAcc = (amountMatches / totalCases) * 100;
    const dateAcc = (dateMatches / totalCases) * 100;
    const taxIdAcc = (taxIdMatches / totalCases) * 100;

    console.log('\n--- DOCULOCKER BENCHMARK RESULTS ---');
    console.log(`Liczba przypadków: ${totalCases}`);
    console.log(`Store Identification: ${storeAcc.toFixed(1)}% (${storeMatches}/${totalCases})`);
    console.log(`Total Amount Match:   ${amountAcc.toFixed(1)}% (${amountMatches}/${totalCases})`);
    console.log(`Purchase Date Match:  ${dateAcc.toFixed(1)}% (${dateMatches}/${totalCases})`);
    console.log(`Tax ID (NIP) Match:   ${taxIdAcc.toFixed(1)}% (${taxIdMatches}/${totalCases})`);
    console.log('------------------------------------\n');
  });
});
