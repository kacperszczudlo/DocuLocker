import { OcrRecognitionResult, ParsedAmount, ParsedDate, ParsedReceiptData } from './types';

interface StoreDefinition {
  readonly name: string;
  readonly matchRegex: RegExp;
}

/**
 * Predefiniowana lista sieci handlowych i marek powszechnie operujacych na rynku polskim.
 * Wykorzystywana do bezposredniego dopasowywania logotypow i naglowkow fiskalnych.
 */
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

/**
 * Heurystyczny analizator paragonow fiskalnych (HeuristicReceiptParser).
 *
 * Ekstrahuje kluczowe dane biznesowe z surowego tekstu OCR bez uzycia chmury
 * ani zewnetrznych modeli jezykowych (pelna prywatnosc Zero-Data na urzadzeniu).
 */
export class HeuristicReceiptParser {
  /**
   * Glowna metoda parsujaca surowy wynik OCR w ustrukturyzowany obiekt paragonu.
   *
   * @param ocrResult Wynik rozpoznawania tekstu zwrocony przez silnik OCR.
   * @returns Ustrukturyzowane dane paragonu wraz z sugerowanym tytulem.
   */
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

  /**
   * Ekstrahuje nazwe sklepu lub marki, przeszukujac pierwsze 10 linii tekstu paragonu.
   *
   * @param lines Tablica oczyszczonych linii tekstu OCR.
   * @returns Rozpoznana nazwa marki lub null, jesli nie dopasowano do bazy wzorcow.
   */
  static extractStoreName(lines: readonly string[]): string | null {
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

  /**
   * Ekstrahuje laczna kwote transakcji (sume fiskalna) w oparciu o polskie i miedzynarodowe
   * slowa kluczowe (np. 'SUMA', 'RAZEM', 'DO ZAPLATY') oraz heurystyki pozycji.
   *
   * @param lines Tablica oczyszczonych linii tekstu OCR.
   * @returns Obiekt kwoty, waluty i wspolczynnika pewnosci lub null, gdy nie znaleziono kwoty.
   */
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

  /**
   * Ekstrahuje date dokonania transakcji zakupu w formatach ISO (YYYY-MM-DD),
   * tradycyjnym polskim (DD-MM-YYYY, DD.MM.YYYY) oraz skroconym (DD-MM-YY).
   *
   * @param lines Tablica oczyszczonych linii tekstu OCR.
   * @returns Obiekt daty w znormalizowanym formacie ISO-8601 lub null, gdy nie znaleziono daty.
   */
  static extractPurchaseDate(lines: readonly string[]): ParsedDate | null {
    const isoDateRegex = /\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/;
    const polishDateRegex = /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/;
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

  /**
   * Ekstrahuje 10-cyfrowy Numer Identyfikacji Podatkowej (NIP) sprzedawcy.
   *
   * @param lines Tablica oczyszczonych linii tekstu OCR.
   * @returns 10-cyfrowy NIP pozbawiony separatorow lub null.
   */
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

  /**
   * Generuje czytelny, sugerowany tytul dokumentu dla uzytkownika.
   *
   * @param storeName Rozpoznana nazwa sklepu.
   * @param amount Rozpoznana kwota transakcji.
   * @param date Rozpoznana data zakupu.
   * @returns Tytul ulatwiajacy natychmiastowa identyfikacje w sejfie.
   */
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
