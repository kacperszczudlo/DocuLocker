import { SqlDatabase } from '../connection';
import { DocumentType, DocumentWithDetails, WarrantyStatus } from '../types';

export interface CreateDocumentParams {
  readonly id: string; // UUID v4
  readonly title: string;
  readonly storeId?: number | null;
  readonly categoryId?: number | null;
  readonly totalAmount: number;
  readonly currency?: string;
  readonly purchaseDate: string; // YYYY-MM-DD
  readonly documentType?: DocumentType;
  readonly notes?: string | null;
  readonly rawOcrText?: string | null;
  readonly warrantyMonths?: number;
  readonly returnWindowDays?: number;
  readonly primaryImagePath?: string | null;
}

export class DocumentRepository {
  constructor(private readonly db: SqlDatabase) {}

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

  async searchFullText(query: string): Promise<DocumentWithDetails[]> {
    // Wyszukiwanie przez modul FTS5
    const cleanQuery = query.trim().replace(/['"*]/g, '');
    if (!cleanQuery) {
      return this.listDocuments();
    }

    try {
      const sql = `
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
        ORDER BY rank;
      `;
      return await this.db.getAllAsync<DocumentWithDetails>(sql, [cleanQuery + '*']);
    } catch {
      // Fallback: standardowe wyszukiwanie LIKE jesli srodowisko SQLite nie posiada FTS5
      const fallbackSql = `
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
        WHERE d.title LIKE ? OR d.notes LIKE ? OR d.raw_ocr_text LIKE ?
        ORDER BY d.purchase_date DESC;
      `;
      const likeParam = `%${cleanQuery}%`;
      return await this.db.getAllAsync<DocumentWithDetails>(fallbackSql, [likeParam, likeParam, likeParam]);
    }
  }

  async deleteDocument(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM documents WHERE id = ?;', [id]);
  }
}
