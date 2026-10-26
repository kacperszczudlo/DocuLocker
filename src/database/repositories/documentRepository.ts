import { SqlDatabase } from '../connection';
import { DocumentType, DocumentWithDetails } from '../types';

/** Parametry wejsciowe procedury tworzenia dokumentu w repozytorium. */
export interface CreateDocumentParams {
  /** Unikalny identyfikator UUID v4 dokumentu. */
  readonly id: string;
  /** Tytul dokumentu. */
  readonly title: string;
  /** Opcjonalny identyfikator powiazanego sklepu. */
  readonly storeId?: number | null;
  /** Opcjonalny identyfikator przypisanej kategorii. */
  readonly categoryId?: number | null;
  /** Kwota brutto z paragonu. */
  readonly totalAmount: number;
  /** Waluta rozliczeniowa (domyslnie 'PLN'). */
  readonly currency?: string;
  /** Data zakupu (YYYY-MM-DD). */
  readonly purchaseDate: string;
  /** Typ dokumentu (RECEIPT, INVOICE, CONTRACT, WARRANTY_CARD, OTHER). */
  readonly documentType?: DocumentType;
  /** Opcjonalne notatki uzytkownika. */
  readonly notes?: string | null;
  /** Surowy tekst OCR zachowywany w celu indeksowania w SQLite FTS5. */
  readonly rawOcrText?: string | null;
  /** Czas trwania gwarancji w pelnych miesiacach (domyslnie 24). */
  readonly warrantyMonths?: number;
  /** Czas na zwrot towaru w dniach kalendarzowych (domyslnie 14). */
  readonly returnWindowDays?: number;
  /** Sciezka do zapisanego zdjecia paragonu na nosniku urzadzenia. */
  readonly primaryImagePath?: string | null;
}

/**
 * Repozytorium dokumentow sejfu fiskalnego (DocumentRepository).
 * Realizuje pelny CRUD, wyszukiwanie pelnotekstowe FTS5 z polskimi znakami diakrytycznymi
 * oraz zarzadzanie kaskadowymi relacjami gwarancji i zalacznikow.
 */
export class DocumentRepository {
  /**
   * Inicjalizuje repozytorium dokumentow.
   *
   * @param db Polaczenie bazy danych `SqlDatabase`.
   */
  constructor(private readonly db: SqlDatabase) {}

  /**
   * Tworzy nowy dokument wewnatrz atomowej transakcji SQLite:
   * 1. Wstawia glowny rekord do tabeli `documents` (co automatycznie zasila FTS5 przez triggery).
   * 2. Wylicza i wstawia rekord ochrony do tabeli `warranties`.
   * 3. Wstawia powiazanie zdjecia do tabeli `document_attachments` jako glowny zalacznik.
   *
   * @param params Komplet parametrow tworzonego dokumentu.
   * @returns Unikalny identyfikator UUID utworzonego dokumentu.
   */
  async createDocument(params: CreateDocumentParams): Promise<string> {
    const currency = params.currency ?? 'PLN';
    const documentType = params.documentType ?? 'RECEIPT';
    const warrantyMonths = params.warrantyMonths ?? 24;
    const returnWindowDays = params.returnWindowDays ?? 14;

    await this.db.withTransactionAsync(async () => {
      // 1. Zapis dokumentu
      await this.db.runAsync(
        `INSERT INTO documents (
          id, title, store_id, category_id, total_amount, currency,
          purchase_date, document_type, notes, raw_ocr_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          params.id,
          params.title,
          params.storeId ?? null,
          params.categoryId ?? null,
          params.totalAmount,
          currency,
          params.purchaseDate,
          documentType,
          params.notes ?? null,
          params.rawOcrText ?? null,
        ]
      );

      // 2. Wyliczenie daty konca gwarancji i zwrotu w SQL
      await this.db.runAsync(
        `INSERT INTO warranties (
          document_id, duration_months, end_date, return_window_days, return_deadline, status
        ) VALUES (
          ?,
          ?,
          date(?, '+' || ? || ' months'),
          ?,
          date(?, '+' || ? || ' days'),
          'ACTIVE'
        );`,
        [
          params.id,
          warrantyMonths,
          params.purchaseDate,
          warrantyMonths,
          returnWindowDays,
          params.purchaseDate,
          returnWindowDays,
        ]
      );

      // 3. Zapis glownego zalacznika (jesli podano)
      if (params.primaryImagePath) {
        await this.db.runAsync(
          `INSERT INTO document_attachments (
            id, document_id, file_path, file_type, file_size_bytes, is_primary
          ) VALUES (?, ?, ?, 'IMAGE_JPEG', 0, 1);`,
          [params.id + '_att', params.id, params.primaryImagePath]
        );
      }
    });

    return params.id;
  }

  /**
   * Pobiera pojedynczy dokument wedlug jego unikalnego identyfikatora UUID
   * z pelnymi zlaczeniami (sklep, kategoria, status gwarancji, sciezka zdjecia).
   *
   * @param id UUID dokumentu.
   * @returns Szczegolowy rekord `DocumentWithDetails` lub null.
   */
  async getDocumentById(id: string): Promise<DocumentWithDetails | null> {
    const sql = `
      SELECT 
        d.id, d.title, d.store_id, d.category_id, d.total_amount, d.currency,
        d.purchase_date, d.document_type, d.notes, d.raw_ocr_text, d.is_favorite,
        d.created_at, d.updated_at,
        s.name as store_name,
        c.name as category_name, c.icon as category_icon, c.color_hex as category_color,
        w.end_date as warranty_end_date, w.status as warranty_status, w.return_deadline,
        a.file_path as primary_image_path
      FROM documents d
      LEFT JOIN stores s ON d.store_id = s.id
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN warranties w ON d.id = w.document_id
      LEFT JOIN document_attachments a ON d.id = a.document_id AND a.is_primary = 1
      WHERE d.id = ?;
    `;
    return this.db.getFirstAsync<DocumentWithDetails>(sql, [id]);
  }

  /**
   * Pobiera liste dokumentow sejfu, opcjonalnie przefiltrowana wg kategorii,
   * posortowana malejaco wg daty zakupu (najnowsze na poczatku).
   *
   * @param categoryId Opcjonalny identyfikator kategorii.
   * @returns Tablica dokumentow ze zlaczeniami.
   */
  async listDocuments(categoryId?: number): Promise<DocumentWithDetails[]> {
    let sql = `
      SELECT 
        d.id, d.title, d.store_id, d.category_id, d.total_amount, d.currency,
        d.purchase_date, d.document_type, d.notes, d.raw_ocr_text, d.is_favorite,
        d.created_at, d.updated_at,
        s.name as store_name,
        c.name as category_name, c.icon as category_icon, c.color_hex as category_color,
        w.end_date as warranty_end_date, w.status as warranty_status, w.return_deadline,
        a.file_path as primary_image_path
      FROM documents d
      LEFT JOIN stores s ON d.store_id = s.id
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN warranties w ON d.id = w.document_id
      LEFT JOIN document_attachments a ON d.id = a.document_id AND a.is_primary = 1
    `;
    const params: unknown[] = [];

    if (categoryId) {
      sql += ' WHERE d.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY d.purchase_date DESC;';
    return this.db.getAllAsync<DocumentWithDetails>(sql, params);
  }

  /**
   * Przeszukuje tresc sejfu przy uzyciu wirtualnej tabeli FTS5 (Full-Text Search),
   * uwzgledniajacej polska fleksje i brak diakrytykow (`tokenize='unicode61 remove_diacritics 2'`).
   * W przypadku braku modulu FTS5 w srodowisku automatycznie stosuje bezpieczny fallback LIKE.
   *
   * @param query Szukana fraza tekstowa (tytul, nazwa pozycji, NIP, tekst paragonu).
   * @param categoryId Opcjonalny filtr kategorii.
   * @returns Posortowana wg relewancji (rank) lista dokumentow.
   */
  async searchFullText(query: string, categoryId?: number): Promise<DocumentWithDetails[]> {
    const cleanQuery = query.trim().replace(/['"*]/g, '');
    if (!cleanQuery) {
      return this.listDocuments(categoryId);
    }

    try {
      let sql = `
        SELECT 
          d.id, d.title, d.store_id, d.category_id, d.total_amount, d.currency,
          d.purchase_date, d.document_type, d.notes, d.raw_ocr_text, d.is_favorite,
          d.created_at, d.updated_at,
          s.name as store_name,
          c.name as category_name, c.icon as category_icon, c.color_hex as category_color,
          w.end_date as warranty_end_date, w.status as warranty_status, w.return_deadline,
          a.file_path as primary_image_path
        FROM documents_fts fts
        JOIN documents d ON fts.document_id = d.id
        LEFT JOIN stores s ON d.store_id = s.id
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN warranties w ON d.id = w.document_id
        LEFT JOIN document_attachments a ON d.id = a.document_id AND a.is_primary = 1
        WHERE documents_fts MATCH ?
      `;
      const params: unknown[] = [cleanQuery + '*'];

      if (categoryId) {
        sql += ' AND d.category_id = ?';
        params.push(categoryId);
      }

      sql += ' ORDER BY rank;';
      return await this.db.getAllAsync<DocumentWithDetails>(sql, params);
    } catch {
      // Fallback: standardowe wyszukiwanie LIKE jesli srodowisko SQLite nie posiada aktywnego FTS5
      let fallbackSql = `
        SELECT 
          d.id, d.title, d.store_id, d.category_id, d.total_amount, d.currency,
          d.purchase_date, d.document_type, d.notes, d.raw_ocr_text, d.is_favorite,
          d.created_at, d.updated_at,
          s.name as store_name,
          c.name as category_name, c.icon as category_icon, c.color_hex as category_color,
          w.end_date as warranty_end_date, w.status as warranty_status, w.return_deadline,
          a.file_path as primary_image_path
        FROM documents d
        LEFT JOIN stores s ON d.store_id = s.id
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN warranties w ON d.id = w.document_id
        LEFT JOIN document_attachments a ON d.id = a.document_id AND a.is_primary = 1
        WHERE (d.title LIKE ? OR d.notes LIKE ? OR d.raw_ocr_text LIKE ? OR s.name LIKE ?)
      `;
      const likeParam = `%${cleanQuery}%`;
      const fallbackParams: unknown[] = [likeParam, likeParam, likeParam, likeParam];

      if (categoryId) {
        fallbackSql += ' AND d.category_id = ?';
        fallbackParams.push(categoryId);
      }

      fallbackSql += ' ORDER BY d.purchase_date DESC;';
      return await this.db.getAllAsync<DocumentWithDetails>(fallbackSql, fallbackParams);
    }
  }

  /**
   * Usuwa dokument z bazy danych wraz z powiazanymi rekordami (kaskadowo: warranties, attachments, FTS5).
   *
   * @param id UUID dokumentu do usuniecia.
   */
  async deleteDocument(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM documents WHERE id = ?;', [id]);
  }
}
