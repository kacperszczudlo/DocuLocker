export const BASE_DDL_STATEMENTS = [
  // 1. Tabela kategorii
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'folder',
    color_hex TEXT NOT NULL DEFAULT '#64748B',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 2. Tabela sklepow
  `CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    tax_id TEXT,
    default_return_days INTEGER NOT NULL DEFAULT 14,
    website_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 3. Tabela dokumentow
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'PLN',
    purchase_date TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'RECEIPT' CHECK(document_type IN ('RECEIPT', 'INVOICE', 'CONTRACT', 'WARRANTY_CARD', 'OTHER')),
    notes TEXT,
    raw_ocr_text TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK(is_favorite IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 4. Tabela gwarancji
  `CREATE TABLE IF NOT EXISTS warranties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
    duration_months INTEGER NOT NULL DEFAULT 24 CHECK(duration_months >= 0),
    end_date TEXT NOT NULL,
    return_window_days INTEGER NOT NULL DEFAULT 14 CHECK(return_window_days >= 0),
    return_deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CLAIMED')),
    notification_30d_scheduled INTEGER NOT NULL DEFAULT 0 CHECK(notification_30d_scheduled IN (0, 1)),
    notification_7d_scheduled INTEGER NOT NULL DEFAULT 0 CHECK(notification_7d_scheduled IN (0, 1)),
    notification_return_scheduled INTEGER NOT NULL DEFAULT 0 CHECK(notification_return_scheduled IN (0, 1)),
    claim_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 5. Tabela zalacznikow
  `CREATE TABLE IF NOT EXISTS document_attachments (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK(file_type IN ('IMAGE_JPEG', 'IMAGE_PNG', 'PDF')),
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,

  // 6. Tagi i powiazania
  `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );`,

  `CREATE TABLE IF NOT EXISTS document_tags (
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
  );`,

  // 7. Indeksy wydajnosciowe
  `CREATE INDEX IF NOT EXISTS idx_documents_purchase_date ON documents(purchase_date DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_documents_store_id ON documents(store_id);`,
  `CREATE INDEX IF NOT EXISTS idx_warranties_end_date ON warranties(end_date ASC);`,
  `CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_document_id ON document_attachments(document_id);`,
];

export const FTS_DDL_STATEMENTS = [
  // Wyszukiwanie pelnotekstowe FTS5
  `CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    document_id UNINDEXED,
    title,
    notes,
    raw_ocr_text,
    content='documents',
    content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 2'
  );`,

  // Triggery synchronizujace FTS5
  `CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, document_id, title, notes, raw_ocr_text)
    VALUES (new.rowid, new.id, new.title, new.notes, new.raw_ocr_text);
  END;`,

  `CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, document_id, title, notes, raw_ocr_text)
    VALUES ('delete', old.rowid, old.id, old.title, old.notes, old.raw_ocr_text);
  END;`,

  `CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, document_id, title, notes, raw_ocr_text)
    VALUES ('delete', old.rowid, old.id, old.title, old.notes, old.raw_ocr_text);
    INSERT INTO documents_fts(rowid, document_id, title, notes, raw_ocr_text)
    VALUES (new.rowid, new.id, new.title, new.notes, new.raw_ocr_text);
  END;`,
];

export const SEED_STATEMENTS = [
  `INSERT OR IGNORE INTO categories (name, icon, color_hex, is_system) VALUES
    ('Elektronika i RTV', 'smartphone', '#3B82F6', 1),
    ('AGD i Sprzęt Domowy', 'tv', '#10B981', 1),
    ('Odzież i Obuwie', 'shirt', '#F59E0B', 1),
    ('Dom i Ogród', 'home', '#8B5CF6', 1),
    ('Motoryzacja', 'car', '#EF4444', 1),
    ('Zdrowie i Apteka', 'heart-pulse', '#EC4899', 1),
    ('Sport i Turystyka', 'bike', '#06B6D4', 1),
    ('Inne', 'tag', '#64748B', 1);`,

  `INSERT OR IGNORE INTO stores (name, default_return_days) VALUES
    ('Biedronka', 14),
    ('Lidl', 30),
    ('MediaMarkt', 30),
    ('RTV Euro AGD', 14),
    ('IKEA', 365),
    ('Decathlon', 365),
    ('Rossmann', 14),
    ('Castorama', 365),
    ('Allegro', 14),
    ('Amazon', 30);`,
];
