/**
 * Modele i typy wierszy relacyjnej bazy danych SQLite dla DocuLocker.
 * Wszystkie struktury odzwierciedlaja schemat DDL z zachowaniem niemutowalnosci (readonly).
 */

/** Dopuszczalne typy dokumentow przechowywanych w sejfie. */
export type DocumentType = 'RECEIPT' | 'INVOICE' | 'CONTRACT' | 'WARRANTY_CARD' | 'OTHER';

/** Statusy ochrony gwarancyjnej w tabeli `warranties`. */
export type WarrantyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CLAIMED';

/** Formaty zalacznikow multimedialnych powiazanych z dokumentem. */
export type AttachmentFileType = 'IMAGE_JPEG' | 'IMAGE_PNG' | 'PDF';

/** Wiersz tabeli `categories` - slownik kategorii wydatkow. */
export interface CategoryRow {
  /** Unikalny identyfikator autoincrement. */
  readonly id: number;
  /** Nazwa kategorii (np. Elektronika, Spozywcze, Dom i Ogrod). */
  readonly name: string;
  /** Identyfikator ikony z biblioteki wektorowej. */
  readonly icon: string;
  /** Kod koloru heksadecymalnego do stylizowania chipow. */
  readonly color_hex: string;
  /** Flaga oznaczajaca wbudowana kategorie systemowa (1) lub uzytkownika (0). */
  readonly is_system: number;
  /** Znacznik czasu utworzenia rekordu (ISO-8601). */
  readonly created_at: string;
}

/** Wiersz tabeli `stores` - baza punktow handlowych i sprzedawcow. */
export interface StoreRow {
  /** Unikalny identyfikator autoincrement. */
  readonly id: number;
  /** Nazwa sklepu lub sieci handlowej. */
  readonly name: string;
  /** 10-cyfrowy NIP sprzedawcy lub null. */
  readonly tax_id: string | null;
  /** Domyslna liczba dni na odstapienie od umowy (zwrot). */
  readonly default_return_days: number;
  /** Opcjonalny adres URL strony internetowej sklepu. */
  readonly website_url: string | null;
  /** Znacznik czasu utworzenia rekordu (ISO-8601). */
  readonly created_at: string;
}

/** Wiersz tabeli `documents` - glowny rekord sejfu. */
export interface DocumentRow {
  /** Unikalny klucz glowny UUID v4. */
  readonly id: string;
  /** Tytul dokumentu. */
  readonly title: string;
  /** Klucz obcy do tabeli `stores` lub null. */
  readonly store_id: number | null;
  /** Klucz obcy do tabeli `categories` lub null. */
  readonly category_id: number | null;
  /** Laczna kwota transakcji z paragonu lub faktury. */
  readonly total_amount: number;
  /** Kod waluty ISO 4217 (np. 'PLN'). */
  readonly currency: string;
  /** Data dokonania zakupu (YYYY-MM-DD). */
  readonly purchase_date: string;
  /** Typ dokumentu. */
  readonly document_type: DocumentType;
  /** Dodatkowe notatki uzytkownika. */
  readonly notes: string | null;
  /** Pelny surowy tekst z silnika OCR do indeksowania w FTS5. */
  readonly raw_ocr_text: string | null;
  /** Flaga ulubionego dokumentu (0 lub 1). */
  readonly is_favorite: number;
  /** Znacznik czasu utworzenia rekordu (ISO-8601). */
  readonly created_at: string;
  /** Znacznik czasu ostatniej aktualizacji (ISO-8601). */
  readonly updated_at: string;
}

/** Wiersz tabeli `warranties` - zarzadzanie okresem gwarancyjnym i reklamacjami. */
export interface WarrantyRow {
  /** Unikalny identyfikator autoincrement. */
  readonly id: number;
  /** Klucz obcy do tabeli `documents` (relacja 1:1). */
  readonly document_id: string;
  /** Dlugosc trwania gwarancji w pelnych miesiacach. */
  readonly duration_months: number;
  /** Wyliczona data konca gwarancji (YYYY-MM-DD). */
  readonly end_date: string;
  /** Czas na zwrot towaru w dniach kalendarzowych. */
  readonly return_window_days: number;
  /** Wyliczona data graniczna na dokonanie zwrotu (YYYY-MM-DD). */
  readonly return_deadline: string;
  /** Aktualny stan ochrony. */
  readonly status: WarrantyStatus;
  /** Flaga zaplanowania powiadomienia na 30 dni przed koncem (0 lub 1). */
  readonly notification_30d_scheduled: number;
  /** Flaga zaplanowania powiadomienia na 7 dni przed koncem (0 lub 1). */
  readonly notification_7d_scheduled: number;
  /** Flaga zaplanowania powiadomienia o koncu okna zwrotu (0 lub 1). */
  readonly notification_return_scheduled: number;
  /** Opcjonalne notatki z przebiegu procesu reklamacyjnego. */
  readonly claim_notes: string | null;
  /** Znacznik czasu utworzenia rekordu (ISO-8601). */
  readonly created_at: string;
  /** Znacznik czasu ostatniej modyfikacji (ISO-8601). */
  readonly updated_at: string;
}

/** Wiersz tabeli `attachments` - powiazane pliki binarne (zdjecia, skany, PDF). */
export interface AttachmentRow {
  /** Unikalny identyfikator zalacznika UUID v4. */
  readonly id: string;
  /** Klucz obcy do tabeli `documents`. */
  readonly document_id: string;
  /** Wzgledna lub bezwzgledna sciezka do pliku w pamieci urzadzenia. */
  readonly file_path: string;
  /** Typ mime pliku. */
  readonly file_type: AttachmentFileType;
  /** Rozmiar pliku wyrazony w bajtach. */
  readonly file_size_bytes: number;
  /** Flaga oznaczajaca glowny skan prezentowany na miniaturkach (0 lub 1). */
  readonly is_primary: number;
  /** Znacznik czasu dodania pliku (ISO-8601). */
  readonly created_at: string;
}

/** Wiersz tabeli `tags` - znaczniki organizacyjne uzytkownika. */
export interface TagRow {
  /** Identyfikator tagu autoincrement. */
  readonly id: number;
  /** Unikalna nazwa tagu. */
  readonly name: string;
}

/** Zdenormalizowany obiekt dokumentu polaczony ze sklepem, kategoria i gwarancja. */
export interface DocumentWithDetails extends DocumentRow {
  /** Nazwa powiazanego sklepu. */
  readonly store_name: string | null;
  /** Nazwa przypisanej kategorii. */
  readonly category_name: string | null;
  /** Identyfikator ikony kategorii. */
  readonly category_icon: string | null;
  /** Kolor krotki kategorii. */
  readonly category_color: string | null;
  /** Data konca gwarancji (YYYY-MM-DD). */
  readonly warranty_end_date: string | null;
  /** Status gwarancji. */
  readonly warranty_status: WarrantyStatus | null;
  /** Data graniczna zwrotu (YYYY-MM-DD). */
  readonly return_deadline: string | null;
  /** Sciezka do glownego zdjecia paragonu. */
  readonly primary_image_path: string | null;
}
