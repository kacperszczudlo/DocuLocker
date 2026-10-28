import { OcrRecognitionResult, ParsedAmount, ParsedDate, ParsedReceiptData } from './types';

interface StoreDefinition {
  readonly name: string;
  readonly matchRegex: RegExp;
  /** Znormalizowana igla do dopasowan OCR (bez spacji, cyfry→litery). */
  readonly normalizedNeedle: string;
  readonly categoryName: string;
  readonly defaultReturnDays: number;
  readonly taxId?: string;
}

/**
 * Predefiniowana lista sieci handlowych i marek powszechnie operujacych na rynku polskim.
 * Wykorzystywana do bezposredniego dopasowywania logotypow, naglowkow fiskalnych i numerow NIP.
 */
const KNOWN_STORES: readonly StoreDefinition[] = [
  store('Biedronka', /\b(biedronka|jeronimo\s+martins\s+polska)\b/i, 'biedronka|jeronimomartinspolska', 'Inne', 14, '7791011327'),
  store('Hebe', /\b(hebe|jeronimo\s+martins\s+drogerie)\b/i, 'hebe|jeronimomartinsdrogerie', 'Zdrowie i Apteka', 14, '5213605417'),
  store('Lidl', /\b(lidl)\b/i, 'lidl', 'Inne', 30, '7811897323'),
  store('MediaMarkt', /\b(media\s*markt|media\s*saturn)\b/i, 'mediamarkt|mediasaturn', 'Elektronika i RTV', 30, '7010327611'),
  store('RTV Euro AGD', /\b(rtv\s*euro\s*agd|euro[- ]?net)\b/i, 'rtveuroagd|euronet', 'Elektronika i RTV', 14, '5270005984'),
  store('Media Expert', /\b(media\s*expert|terg)\b/i, 'mediaexpert|terg', 'Elektronika i RTV', 14, '6182148886'),
  store('x-kom', /\b(x[-\s]?kom)\b/i, 'xkom', 'Elektronika i RTV', 14, '9492107026'),
  store('Neonet', /\b(neonet)\b/i, 'neonet', 'Elektronika i RTV', 14, '8951786278'),
  store('Komputronik', /\b(komputronik)\b/i, 'komputronik', 'Elektronika i RTV', 14, '9720903043'),
  store('IKEA', /\b(ikea)\b/i, 'ikea', 'Dom i Ogród', 365, '5270107448'),
  store('Decathlon', /\b(decathlon)\b/i, 'decathlon', 'Sport i Turystyka', 365, '9511855233'),
  store('Martes Sport', /\b(martes\s*sport)\b/i, 'martessport', 'Sport i Turystyka', 30, '5471794695'),
  store('4F', /\b(4f|otcf)\b/i, '4f|otcf', 'Sport i Turystyka', 30, '9451978451'),
  store('Rossmann', /\b(rossmann)\b/i, 'rossmann', 'Zdrowie i Apteka', 14, '7270019198'),
  store('Super-Pharm', /\b(super[- ]?pharm)\b/i, 'superpharm', 'Zdrowie i Apteka', 14, '5213164998'),
  store('Castorama', /\b(castorama)\b/i, 'castorama', 'Dom i Ogród', 365, '5261009959'),
  store('Leroy Merlin', /\b(leroy\s*merlin)\b/i, 'leroymerlin', 'Dom i Ogród', 365, '1130005047'),
  store('OBI', /\b(obi|superhobby)\b/i, 'obi|superhobby', 'Dom i Ogród', 365, '9511008094'),
  store('JYSK', /\b(jysk)\b/i, 'jysk', 'Dom i Ogród', 365, '5862016372'),
  store('Agata Meble', /\b(agata(\s+meble)?)\b/i, 'agatameble|agata', 'Dom i Ogród', 30, '6340197476'),
  store('Black Red White', /\b(black\s*red\s*white|\bbrw\b)\b/i, 'blackredwhite|brw', 'Dom i Ogród', 14, '9180016654'),
  store('Bricomarché', /\b(bricomarche|bricomarché)\b/i, 'bricomarche', 'Dom i Ogród', 30, '7772648750'),
  store('Allegro', /\b(allegro)\b/i, 'allegro', 'Inne', 14),
  store('Amazon', /\b(amazon)\b/i, 'amazon', 'Inne', 30),
  store('Zabka', /\b(zabka|żabka)\b/i, 'zabka', 'Inne', 14, '5222728103'),
  store('Dino', /\b(dino\s+polska|dino)\b/i, 'dino', 'Inne', 14, '6932155983'),
  store('Carrefour', /\b(carrefour)\b/i, 'carrefour', 'Inne', 14, '9370008168'),
  store('Auchan', /\b(auchan)\b/i, 'auchan', 'Inne', 14, '5260309174'),
  store('Kaufland', /\b(kaufland)\b/i, 'kaufland', 'Inne', 14, '6252258832'),
  store('E.Leclerc', /\b(e\.?\s*leclerc|leclerc)\b/i, 'eleclerc|leclerc', 'Inne', 14, '5252187680'),
  store('Stokrotka', /\b(stokrotka)\b/i, 'stokrotka', 'Inne', 14, '7122892695'),
  store('Polomarket', /\b(polomarket)\b/i, 'polomarket', 'Inne', 14, '5562182044'),
  store('Lewiatan', /\b(lewiatan)\b/i, 'lewiatan', 'Inne', 14, '7792130386'),
  store('Action', /\b(action(\s+polska)?)\b/i, 'action', 'Inne', 14, '7792434601'),
  store('Pepco', /\b(pepco)\b/i, 'pepco', 'Odzież i Obuwie', 14, '7822131141'),
  store('Dealz', /\b(dealz)\b/i, 'dealz', 'Inne', 14, '9721283626'),
  store('Tedi', /\b(tedi)\b/i, 'tedi', 'Inne', 14, '7792487425'),
  store('Netto', /\b(netto)\b/i, 'netto', 'Inne', 14, '8520401824'),
  store('Aldi', /\b(aldi)\b/i, 'aldi', 'Inne', 14, '8522436894'),
  store('Empik', /\b(empik)\b/i, 'empik', 'Inne', 14, '5260207427'),
  store('Zara', /\b(zara|inditex)\b/i, 'zara|inditex', 'Odzież i Obuwie', 30, '5252277883'),
  store('H&M', /\b(h&m|hennes\s*&\s*mauritz)\b/i, 'hm|hennesmauritz', 'Odzież i Obuwie', 30, '5252253240'),
  store('TK Maxx', /\b(tk\s*maxx)\b/i, 'tkmaxx', 'Odzież i Obuwie', 28, '5252445778'),
  store('HalfPrice', /\b(half\s*price)\b/i, 'halfprice', 'Odzież i Obuwie', 30, '6922201324'),
  store('CCC', /\b(salon\s*ccc|sklep\s*ccc|\bccc\b(?!\s*shoes))\b/i, 'ccc', 'Odzież i Obuwie', 14, '6922201324'),
  store('Deichmann', /\b(deichmann)\b/i, 'deichmann', 'Odzież i Obuwie', 30, '9542240974'),
  store('Sinsay', /\b(sinsay)\b/i, 'sinsay', 'Odzież i Obuwie', 30, '5831014898'),
  store('Reserved', /\b(reserved)\b/i, 'reserved', 'Odzież i Obuwie', 14, '5831014898'),
  store('Cropp', /\b(cropp)\b/i, 'cropp', 'Odzież i Obuwie', 30, '5831014898'),
  store('House', /\b(house)\b/i, 'house', 'Odzież i Obuwie', 30, '5831014898'),
  store('Mohito', /\b(mohito)\b/i, 'mohito', 'Odzież i Obuwie', 30, '5831014898'),
  store('eobuwie', /\b(eobuwie|modivo)\b/i, 'eobuwie|modivo', 'Odzież i Obuwie', 30, '9291653958'),
  store('Douglas', /\b(douglas)\b/i, 'douglas', 'Zdrowie i Apteka', 30, '5262507850'),
  store('Sephora', /\b(sephora)\b/i, 'sephora', 'Zdrowie i Apteka', 30, '5262276326'),
  store('DOZ Apteka', /\b(doz(\s+apteka)?)\b/i, 'dozapteka', 'Zdrowie i Apteka', 14, '7282798150'),
  store('Smyk', /\b(smyk)\b/i, 'smyk', 'Inne', 14),
  store('Orlen', /\b(orlen|pkn\s*orlen)\b/i, 'orlen|pknorlen', 'Inne', 14, '7740001454'),
  store('Shell', /\b(shell)\b/i, 'shell', 'Inne', 14, '5261009190'),
  store('BP', /\b(bp\s*europa|stacja\s*bp)\b/i, 'bpeuropa|stacjabp', 'Inne', 14, '5262415199'),
  store('Circle K', /\b(circle\s*k|statoil)\b/i, 'circlek|statoil', 'Inne', 14, '5260304404'),
  store('Moya', /\b(moya|anwim)\b/i, 'moya|anwim', 'Inne', 14, '5270104111'),

];

const HEADER_SKIP_REGEX =
  /\b(paragon|fiskalny|faktura|nip|data|suma|razem|total|kasa|kasjer|terminal|nr\s|ul\.|sprzeda|platn|gotow|blik|rozlicz|wydruk|godzin)\b/i;

function store(
  name: string,
  matchRegex: RegExp,
  normalizedNeedle: string,
  categoryName: string,
  defaultReturnDays: number,
  taxId?: string
): StoreDefinition {
  return { name, matchRegex, normalizedNeedle, categoryName, defaultReturnDays, taxId };
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

    const detectedTaxId = this.extractTaxId(lines);
    const known = this.matchKnownStore(lines, detectedTaxId);
    const storeName = known?.name ?? this.extractFallbackStoreName(lines);
    const suggestedCategoryName = known?.categoryName ?? null;
    const suggestedReturnDays = known?.defaultReturnDays ?? null;
    const totalAmount = this.extractTotalAmount(lines);
    const purchaseDate = this.extractPurchaseDate(lines);
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
   * Dopasowuje znana siec handlowa w oparciu o tresc naglowka lub NIP sprzedawcy,
   * z odpornoscia na typowe bledy OCR (0/O, 1/I, brak spacji).
   */
  static matchKnownStore(lines: readonly string[], taxId?: string | null): StoreDefinition | null {
    // 1. Najpierw sprawdzamy bezposrednie wystapienie nazwy marki lub szyldu w liniach tekstu
    for (const line of lines) {
      for (const candidate of KNOWN_STORES) {
        if (candidate.matchRegex.test(line)) {
          return candidate;
        }
      }
    }

    // 2. Dopasowanie rozmyte znormalizowanego tekstu (odpornosc na błędy spacji i OCR)
    const normalizedFull = normalizeForMatch(lines.join(' '));
    for (const candidate of KNOWN_STORES) {
      const needles = candidate.normalizedNeedle.split('|');
      if (needles.some((needle) => needle.length >= 3 && normalizedFull.includes(needle))) {
        return candidate;
      }
    }

    // 3. Rezerwowe dopasowanie po NIP podatnika (gdy marka/szyld zostaly zamazane lub uciete)
    if (taxId) {
      const matchByTax = KNOWN_STORES.find((candidate) => candidate.taxId === taxId);
      if (matchByTax) {
        return matchByTax;
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
    const highestPriorityKeywords = /\b(do\s*zap[lł]aty|zap[lł]acono|do\s*zap[lł]ate|su[mn][aą]\s*(?:pln|z[łl])|razem\s*(?:pln|z[łl]))\b/i;
    const highPriorityKeywords = /\b(su[mn][aą]|razem|total)\b/i;
    const mediumPriorityKeywords = /\b(karta|kart[aą]|p[lł]atno[sś][cć]|sprzeda[zż]|got[oó]wka|blik|nale[zż]no[sś][cć]|rozliczenie)\b/i;
    const excludeKeywords = /\b(ptu|vat|podat|netto|przed\s*rabat|warto[sś][cć]\s*rabat|rabat[y]?\b|opust|oszcz[eę]dzasz)\b/i;

    let bestMatch: ParsedAmount | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Odrzucamy linie bedace rozbiciem podatkowym (np. SUMA PTU, KWOTA PTU) lub rabatami
      if (excludeKeywords.test(line) && !highestPriorityKeywords.test(line)) {
        continue;
      }

      const isHighest = highestPriorityKeywords.test(line);
      const isHigh = highPriorityKeywords.test(line);
      const isMedium = mediumPriorityKeywords.test(line);

      if (!isHighest && !isHigh && !isMedium) {
        continue;
      }

      // Sprawdzamy linie biezaca oraz kolejna (jesli keyword i kwota sa w sasiednich liniach)
      const textToScan = (isHighest || isHigh) && i + 1 < lines.length && !/\d+[,\.]\d{2}/.test(line)
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
          const confidence = isHighest ? 0.98 : isHigh ? 0.90 : 0.75;
          // Jesli pewnosc jest wieksza badz rowna, preferujemy pozycje znajdujace sie nizej (podsumowanie fiskalne)
          if (!bestMatch || confidence >= bestMatch.confidence) {
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
    const nipRegex = /\bnip[:\s]*([0-9oOiIlLsS\s-]{10,18})/i;
    for (const line of lines) {
      if (/\bnip\s*(?:nabywcy|klienta)\b/i.test(line)) {
        continue;
      }
      const match = nipRegex.exec(line);
      if (match) {
        const normalized = match[1]
          .replace(/[-\s]/g, '')
          .replace(/[oO]/g, '0')
          .replace(/[iIlL]/g, '1')
          .replace(/[sS]/g, '5');
        if (normalized.length === 10 && /^\d{10}$/.test(normalized)) {
          return normalized;
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
