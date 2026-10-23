import { OcrRecognitionResult, ParsedAmount, ParsedDate, ParsedReceiptData } from './types';

interface StoreDefinition {
  readonly name: string;
  readonly matchRegex: RegExp;
}

const KNOWN_STORES: readonly StoreDefinition[] = [
  { name: 'Biedronka', matchRegex: /\b(biedronka|jeronimo\s+martins)\b/i },
  { name: 'Lidl', matchRegex: /\b(lidl)\b/i },
  { name: 'MediaMarkt', matchRegex: /\b(media\s*markt)\b/i },
  { name: 'RTV Euro AGD', matchRegex: /\b(rtv\s*euro\s*agd|euro[- ]net)\b/i },
  { name: 'IKEA', matchRegex: /\b(ikea)\b/i },
  { name: 'Decathlon', matchRegex: /\b(decathlon)\b/i },
  { name: 'Rossmann', matchRegex: /\b(rossmann)\b/i },
  { name: 'Castorama', matchRegex: /\b(castorama)\b/i },
  { name: 'Allegro', matchRegex: /\b(allegro)\b/i },
  { name: 'Amazon', matchRegex: /\b(amazon)\b/i },
  { name: 'Zabka', matchRegex: /\b(zabka|żabka)\b/i },
  { name: 'Dino', matchRegex: /\b(dino\s+polska|dino)\b/i },
  { name: 'Carrefour', matchRegex: /\b(carrefour)\b/i },
  { name: 'Auchan', matchRegex: /\b(auchan)\b/i },
  { name: 'Kaufland', matchRegex: /\b(kaufland)\b/i },
  { name: 'Leroy Merlin', matchRegex: /\b(leroy\s*merlin)\b/i },
  { name: 'Action', matchRegex: /\b(action\s+polska)\b/i },
  { name: 'Pepco', matchRegex: /\b(pepco)\b/i },
];

export class HeuristicReceiptParser {
  static parse(ocrResult: OcrRecognitionResult): ParsedReceiptData {
    const rawText = ocrResult.fullText;
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    const storeName = this.extractStoreName(lines);
    const totalAmount = this.extractTotalAmount(lines);
    const purchaseDate = this.extractPurchaseDate(lines);
    const detectedTaxId = this.extractTaxId(lines);
    const suggestedTitle = this.generateSuggestedTitle(storeName, totalAmount, purchaseDate);

    return {
      suggestedTitle,
      storeName,
      totalAmount,
      purchaseDate,
      detectedTaxId,
      rawText,
    };
  }

  static extractStoreName(lines: readonly string[]): string | null {
    // Sprawdzamy pierwsze 8 linii tekstu (naglowek paragonu)
    const headerLines = lines.slice(0, 8);
    for (const line of headerLines) {
      for (const store of KNOWN_STORES) {
        if (store.matchRegex.test(line)) {
          return store.name;
        }
      }
    }
    return null;
  }

  static extractTotalAmount(lines: readonly string[]): ParsedAmount | null {
    const highPriorityKeywords = /\b(suma|razem|total|do\s+zap[lł]aty)\b/i;
    const mediumPriorityKeywords = /\b(karta|p[lł]atno[sś][cć]|sprzeda[zż])\b/i;

    let bestMatch: ParsedAmount | null = null;

    for (const line of lines) {
      const isHighPriority = highPriorityKeywords.test(line);
      const isMediumPriority = mediumPriorityKeywords.test(line);

      if (!isHighPriority && !isMediumPriority) {
        continue;
      }

      // Wykrywanie waluty w linii
      let currency = 'PLN';
      if (/€|\beur\b/i.test(line)) {
        currency = 'EUR';
      } else if (/\$|\busd\b/i.test(line)) {
        currency = 'USD';
      } else if (/£|\bgbp\b/i.test(line)) {
        currency = 'GBP';
      }

      // Wzorzec dla kwoty: opcjonalna spacja jako separator tysiecy, przecinek lub kropka dla groszy
      // np. "12,49", "49.99", "3 499,00"
      const numberRegex = /(\d{1,3}(?:[\s\.]\d{3})*|\d+)[,\.](\d{2})\b/g;
      let match: RegExpExecArray | null;

      while ((match = numberRegex.exec(line)) !== null) {
        const integerPart = match[1].replace(/[\s\.]/g, '');
        const decimalPart = match[2];
        const numericValue = parseFloat(`${integerPart}.${decimalPart}`);

        if (!isNaN(numericValue) && numericValue > 0) {
          const confidence = isHighPriority ? 0.9 : 0.7;
          // Zawsze preferujemy dopasowanie z wysokim priorytetem
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
              amount: numericValue,
              currency,
              confidence,
            };
          }
        }
      }
    }

    return bestMatch;
  }

  static extractPurchaseDate(lines: readonly string[]): ParsedDate | null {
    // Formaty: YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY, YYYY/MM/DD
    const isoDateRegex = /\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/;
    const polishDateRegex = /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/;

    for (const line of lines) {
      const isoMatch = isoDateRegex.exec(line);
      if (isoMatch) {
        const year = isoMatch[1];
        const month = isoMatch[2];
        const day = isoMatch[3];
        return {
          isoDate: `${year}-${month}-${day}`,
          confidence: 0.9,
        };
      }

      const polishMatch = polishDateRegex.exec(line);
      if (polishMatch) {
        const day = polishMatch[1];
        const month = polishMatch[2];
        const year = polishMatch[3];
        return {
          isoDate: `${year}-${month}-${day}`,
          confidence: 0.9,
        };
      }
    }

    return null;
  }

  static extractTaxId(lines: readonly string[]): string | null {
    const nipRegex = /\bnip[:\s]*([\d\s-]{10,16})/i;
    for (const line of lines) {
      const match = nipRegex.exec(line);
      if (match) {
        const cleanTaxId = match[1].replace(/[-\s]/g, '');
        if (cleanTaxId.length === 10 && /^\d{10}$/.test(cleanTaxId)) {
          return cleanTaxId;
        }
      }
    }
    return null;
  }

  static generateSuggestedTitle(
    storeName: string | null,
    amount: ParsedAmount | null,
    date: ParsedDate | null
  ): string {
    if (storeName && amount) {
      return `Zakup: ${storeName} (${amount.amount.toFixed(2)} ${amount.currency})`;
    }
    if (storeName && date) {
      return `Zakup: ${storeName} (${date.isoDate})`;
    }
    if (storeName) {
      return `Zakup: ${storeName}`;
    }
    if (amount && date) {
      return `Paragon ${amount.amount.toFixed(2)} ${amount.currency} (${date.isoDate})`;
    }
    if (amount) {
      return `Paragon ${amount.amount.toFixed(2)} ${amount.currency}`;
    }
    if (date) {
      return `Paragon (${date.isoDate})`;
    }
    return 'Nowy Paragon';
  }
}
