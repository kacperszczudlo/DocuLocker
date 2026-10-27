import { OcrRecognitionResult, ParsedAmount, ParsedDate, ParsedReceiptData } from './types';

interface StoreDefinition {
  readonly name: string;
  readonly matchRegex: RegExp;
  /** Znormalizowana igla do dopasowan OCR (bez spacji, cyfry→litery). */
  readonly normalizedNeedle: string;
  readonly categoryName: string;
  readonly defaultReturnDays: number;
}

/**
 * Predefiniowana lista sieci handlowych i marek powszechnie operujacych na rynku polskim.
 * Wykorzystywana do bezposredniego dopasowywania logotypow i naglowkow fiskalnych.
 */
const KNOWN_STORES: readonly StoreDefinition[] = [
  store('Biedronka', /\b(biedronka|jeronimo\s+martins)\b/i, 'biedronka|jeronimomartins', 'Inne', 14),
  store('Lidl', /\b(lidl)\b/i, 'lidl', 'Inne', 30),
  store('MediaMarkt', /\b(media\s*markt)\b/i, 'mediamarkt', 'Elektronika i RTV', 30),
  store('RTV Euro AGD', /\b(rtv\s*euro\s*agd|euro[- ]?net)\b/i, 'rtveuroagd|euronet', 'Elektronika i RTV', 14),
  store('Media Expert', /\b(media\s*expert)\b/i, 'mediaexpert', 'Elektronika i RTV', 14),
  store('x-kom', /\b(x[-\s]?kom)\b/i, 'xkom', 'Elektronika i RTV', 14),
  store('Neonet', /\b(neonet)\b/i, 'neonet', 'Elektronika i RTV', 14),
  store('IKEA', /\b(ikea)\b/i, 'ikea', 'Dom i Ogród', 365),
  store('Decathlon', /\b(decathlon)\b/i, 'decathlon', 'Sport i Turystyka', 365),
  store('Rossmann', /\b(rossmann)\b/i, 'rossmann', 'Zdrowie i Apteka', 14),
  store('Castorama', /\b(castorama)\b/i, 'castorama', 'Dom i Ogród', 365),
  store('Leroy Merlin', /\b(leroy\s*merlin)\b/i, 'leroymerlin', 'Dom i Ogród', 365),
  store('Allegro', /\b(allegro)\b/i, 'allegro', 'Inne', 14),
  store('Amazon', /\b(amazon)\b/i, 'amazon', 'Inne', 30),
  store('Zabka', /\b(zabka|żabka)\b/i, 'zabka', 'Inne', 14),
  store('Dino', /\b(dino\s+polska|dino)\b/i, 'dino', 'Inne', 14),
  store('Carrefour', /\b(carrefour)\b/i, 'carrefour', 'Inne', 14),
  store('Auchan', /\b(auchan)\b/i, 'auchan', 'Inne', 14),
  store('Kaufland', /\b(kaufland)\b/i, 'kaufland', 'Inne', 14),
  store('Action', /\b(action(\s+polska)?)\b/i, 'action', 'Inne', 14),
  store('Pepco', /\b(pepco)\b/i, 'pepco', 'Odzież i Obuwie', 14),
  store('Dealz', /\b(dealz)\b/i, 'dealz', 'Inne', 14),
  store('Hebe', /\b(hebe)\b/i, 'hebe', 'Zdrowie i Apteka', 14),
  store('Netto', /\b(netto)\b/i, 'netto', 'Inne', 14),
  store('Aldi', /\b(aldi)\b/i, 'aldi', 'Inne', 14),
  store('Empik', /\b(empik)\b/i, 'empik', 'Inne', 14),
  store('CCC', /\b(ccc)\b/i, 'ccc', 'Odzież i Obuwie', 14),
  store('Reserved', /\b(reserved)\b/i, 'reserved', 'Odzież i Obuwie', 14),
  store('Smyk', /\b(smyk)\b/i, 'smyk', 'Inne', 14),
];

const HEADER_SKIP_REGEX =
  /\b(paragon|fiskalny|nip|data|suma|razem|total|kasa|kasjer|terminal|nr\s|ul\.|sprzeda|platn|gotow|blik|rozlicz|wydruk|godzin)\b/i;

function store(
  name: string,
  matchRegex: RegExp,
  normalizedNeedle: string,
  categoryName: string,
  defaultReturnDays: number
): StoreDefinition {
  return { name, matchRegex, normalizedNeedle, categoryName, defaultReturnDays };
}

/** Normalizuje tekst pod odporne dopasowanie OCR (spacje, diakrytyka, 0/1). */
function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/[^a-z0-9|]/g, '');
}

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

    const known = this.matchKnownStore(lines);
    const storeName = known?.name ?? this.extractFallbackStoreName(lines);
    const suggestedCategoryName = known?.categoryName ?? null;
    const suggestedReturnDays = known?.defaultReturnDays ?? null;
    const totalAmount = this.extractTotalAmount(lines);
    const purchaseDate = this.extractPurchaseDate(lines);
    const detectedTaxId = this.extractTaxId(lines);
    const suggestedTitle = this.generateSuggestedTitle(storeName, totalAmount, purchaseDate);

    return {
      suggestedTitle,
      storeName,
      suggestedCategoryName,
      suggestedReturnDays,
      totalAmount,
      purchaseDate,
      detectedTaxId,
      rawText,
    };
  }

  /**
   * Dopasowuje znana siec handlowa w calym tekscie (nie tylko naglowek),
   * z odpornoscia na typowe bledy OCR (0/O, 1/I, brak spacji).
   */
  static matchKnownStore(lines: readonly string[]): StoreDefinition | null {
    for (const line of lines) {
      for (const candidate of KNOWN_STORES) {
        if (candidate.matchRegex.test(line)) {
          return candidate;
        }
      }
    }

    const normalizedFull = normalizeForMatch(lines.join(' '));
    for (const candidate of KNOWN_STORES) {
      const needles = candidate.normalizedNeedle.split('|');
      if (needles.some((needle) => needle.length >= 3 && normalizedFull.includes(needle))) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Ekstrahuje nazwe sklepu lub marki (kompatybilnosc wsteczna API).
   */
  static extractStoreName(lines: readonly string[]): string | null {
    return this.matchKnownStore(lines)?.name ?? this.extractFallbackStoreName(lines);
  }

  /**
   * Bierze pierwsza sensowna linie naglowka, gdy marka nie jest na liscie znanych sieci.
   */
  static extractFallbackStoreName(lines: readonly string[]): string | null {
    for (const line of lines.slice(0, 8)) {
      if (HEADER_SKIP_REGEX.test(line)) {
        continue;
      }
      if (/\d{2}[-/.]\d{2}[-/.]\d{2,4}/.test(line)) {
        continue;
      }
      if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{3,}/.test(line)) {
        continue;
      }
      if (line.length > 60) {
        continue;
      }
      return line.replace(/\s+/g, ' ').trim();
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
