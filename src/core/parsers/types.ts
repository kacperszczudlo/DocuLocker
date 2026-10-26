/**
 * Typy i struktury danych dla silnika OCR oraz analizatora paragonow fiskalnych.
 */

/** Pojedynczy blok tekstu zwrocony przez silnik detekcji optycznej (OCR). */
export interface OcrTextBlock {
  /** Pelny ciag znakow zawarty w bloku. */
  readonly text: string;
  /** Poszczegolne linie tekstu w obrebie bloku. */
  readonly lines: readonly string[];
}

/** Zbiorczy wynik rozpoznawania optycznego obrazu paragonu. */
export interface OcrRecognitionResult {
  /** Skonsolidowany tekst ze wszystkich blokow OCR. */
  readonly fullText: string;
  /** Kolekcja wyodrebnionych blokow tekstu. */
  readonly blocks: readonly OcrTextBlock[];
  /** Czas przetwarzania na urzadzeniu wyrazony w milisekundach. */
  readonly processingTimeMs: number;
}

/** Wyekstrahowana kwota transakcji z paragonu fiskalnego. */
export interface ParsedAmount {
  /** Numeryczna wartosc kwoty (np. 149.99). */
  readonly amount: number;
  /** Trzyliterowy kod waluty wg standardu ISO 4217 (domyslnie 'PLN'). */
  readonly currency: string;
  /** Wskaznik pewnosci detekcji w zakresie od 0.0 do 1.0. */
  readonly confidence: number;
}

/** Wyekstrahowana data transakcji z paragonu fiskalnego. */
export interface ParsedDate {
  /** Data w znormalizowanym formacie ISO-8601 (YYYY-MM-DD). */
  readonly isoDate: string;
  /** Wskaznik pewnosci detekcji w zakresie od 0.0 do 1.0. */
  readonly confidence: number;
}

/**
 * Strukturalne dane wyodrebnione z surowego tekstu paragonu fiskalnego.
 * Zawiera sugerowane pola gotowe do weryfikacji przez uzytkownika.
 */
export interface ParsedReceiptData {
  /** Sugerowany tytul dokumentu (np. nazwa sklepu + data zakupu). */
  readonly suggestedTitle: string;
  /** Rozpoznana marka lub nazwa sieci handlowej (null jesli nie wykryto w bazie). */
  readonly storeName: string | null;
  /** Rozpoznana kwota koncowa transakcji (suma fiskalna). */
  readonly totalAmount: ParsedAmount | null;
  /** Rozpoznana data zakupu. */
  readonly purchaseDate: ParsedDate | null;
  /** Rozpoznany 10-cyfrowy NIP sprzedawcy (po weryfikacji cyfry kontrolnej). */
  readonly detectedTaxId: string | null;
  /** Kompletny, niezmodyfikowany surowy tekst uzyskany z OCR. */
  readonly rawText: string;
}
