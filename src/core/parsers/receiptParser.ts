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
  { name: 'Action', matchRegex: /\b(action(\s+polska)?)\b/i },
  { name: 'Pepco', matchRegex: /\b(pepco)\b/i },
  { name: 'Dealz', matchRegex: /\b(dealz)\b/i },
  { name: 'Hebe', matchRegex: /\b(hebe)\b/i },
  { name: 'Netto', matchRegex: /\b(netto)\b/i },
  { name: 'Aldi', matchRegex: /\b(aldi)\b/i },
  { name: 'Empik', matchRegex: /\b(empik)\b/i },
  { name: 'CCC', matchRegex: /\b(ccc)\b/i },
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
    // Sprawdzamy pierwsze 10 linii tekstu (naglowek paragonu)
    const headerLines = lines.slice(0, 10);
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
    const highPriorityKeywords = /\b(suma|razem|total|do\s*zap[lł]aty|zap[lł]acono|do\s*zap[lł]ate)\b/i;
    const mediumPriorityKeywords = /\b(karta|kart[aą]|p[lł]atno[sś][cć]|sprzeda[zż]|got[oó]wka|blik|nale[zż]no[sś][cć]|rozliczenie)\b/i;

    let bestMatch: ParsedAmount | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHighPriority = highPriorityKeywords.test(line);
      const isMediumPriority = mediumPriorityKeywords.test(line);

      if (!isHighPriority && !isMediumPriority) {
        continue;
      }

      // Sprawdzamy linie biezaca oraz kolejna (jesli keyword i kwota sa w sasiednich liniach)
      const textToScan = isHighPriority && i + 1 < lines.length && !/\d+[,\.]\d{2}/.test(line)
        ? `${line} ${lines[i + 1]}`
        : line;

      // Wykrywanie waluty
      let currency = 'PLN';
      if (/€|\beur\b/i.test(textToScan)) {
        currency = 'EUR';
      } else if (/\$|\busd\b/i.test(textToScan)) {
        currency = 'USD';
      } else if (/£|\bgbp\b/i.test(textToScan)) {
        currency = 'GBP';
      }

      // Wzorzec dla kwoty: opcjonalna spacja jako separator tysiecy, przecinek lub kropka dla groszy
      const numberRegex = /(\d{1,3}(?:[\s\.]\d{3})*|\d+)[,\.](\d{2})\b/g;
      let match: RegExpExecArray | null;

      while ((match = numberRegex.exec(textToScan)) !== null) {
        const integerPart = match[1].replace(/[\s\.]/g, '');
        const decimalPart = match[2];
        const numericValue = parseFloat(`${integerPart}.${decimalPart}`);

        if (!isNaN(numericValue) && numericValue > 0) {
          const confidence = isHighPriority ? 0.95 : 0.75;
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

    // Fallback: jesli brak slowa kluczowego, szukamy linii z symbolem waluty PLN/zl
    if (!bestMatch) {
      const currencyRegex = /(\d+)[,\.](\d{2})\s*(?:z[łl]|pln)\b/gi;
      for (const line of lines) {
        let match: RegExpExecArray | null;
        while ((match = currencyRegex.exec(line)) !== null) {
          const val = parseFloat(`${match[1]}.${match[2]}`);
          if (!isNaN(val) && val > 0) {
            if (!bestMatch || val > bestMatch.amount) {
              bestMatch = {
                amount: val,
                currency: 'PLN',
                confidence: 0.6,
              };
            }
          }
        }
      }
    }

    return bestMatch;
  }

  static extractPurchaseDate(lines: readonly string[]): ParsedDate | null {
    // 1. Formaty z pelnym 4-cyfrowym rokiem: YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY, YYYY/MM/DD
    const isoDateRegex = /\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/;
    const polishDateRegex = /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/;
    // 2. Formaty z 2-cyfrowym rokiem: DD-MM-YY, DD.MM.YY (np. 23-10-26)
    const shortDateRegex = /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](2[0-9])\b/;

    for (const line of lines) {
      const isoMatch = isoDateRegex.exec(line);
      if (isoMatch) {
        const year = isoMatch[1];
        const month = isoMatch[2];
        const day = isoMatch[3];
        return {
          isoDate: `${year}-${month}-${day}`,
          confidence: 0.95,
        };
      }

      const polishMatch = polishDateRegex.exec(line);
      if (polishMatch) {
        const day = polishMatch[1];
        const month = polishMatch[2];
        const year = polishMatch[3];
        return {
          isoDate: `${year}-${month}-${day}`,
          confidence: 0.95,
        };
      }

      const shortMatch = shortDateRegex.exec(line);
      if (shortMatch) {
        const day = shortMatch[1];
        const month = shortMatch[2];
        const shortYear = shortMatch[3];
        return {
          isoDate: `20${shortYear}-${month}-${day}`,
          confidence: 0.85,
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
