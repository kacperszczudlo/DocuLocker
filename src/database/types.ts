export type DocumentType = 'RECEIPT' | 'INVOICE' | 'CONTRACT' | 'WARRANTY_CARD' | 'OTHER';
export type WarrantyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CLAIMED';
export type AttachmentFileType = 'IMAGE_JPEG' | 'IMAGE_PNG' | 'PDF';

export interface CategoryRow {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
  readonly color_hex: string;
  readonly is_system: number; // 0 or 1
  readonly created_at: string;
}

export interface StoreRow {
  readonly id: number;
  readonly name: string;
  readonly tax_id: string | null;
  readonly default_return_days: number;
  readonly website_url: string | null;
  readonly created_at: string;
}

export interface DocumentRow {
  readonly id: string; // UUID v4
  readonly title: string;
  readonly store_id: number | null;
  readonly category_id: number | null;
  readonly total_amount: number;
  readonly currency: string;
  readonly purchase_date: string; // YYYY-MM-DD
  readonly document_type: DocumentType;
  readonly notes: string | null;
  readonly raw_ocr_text: string | null;
  readonly is_favorite: number; // 0 or 1
  readonly created_at: string;
  readonly updated_at: string;
}

export interface WarrantyRow {
  readonly id: number;
  readonly document_id: string;
  readonly duration_months: number;
  readonly end_date: string; // YYYY-MM-DD
  readonly return_window_days: number;
  readonly return_deadline: string; // YYYY-MM-DD
  readonly status: WarrantyStatus;
  readonly notification_30d_scheduled: number; // 0 or 1
  readonly notification_7d_scheduled: number; // 0 or 1
  readonly notification_return_scheduled: number; // 0 or 1
  readonly claim_notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AttachmentRow {
  readonly id: string; // UUID v4
  readonly document_id: string;
  readonly file_path: string;
  readonly file_type: AttachmentFileType;
  readonly file_size_bytes: number;
  readonly is_primary: number; // 0 or 1
  readonly created_at: string;
}

export interface TagRow {
  readonly id: number;
  readonly name: string;
}

export interface DocumentWithDetails extends DocumentRow {
  readonly store_name: string | null;
  readonly category_name: string | null;
  readonly category_icon: string | null;
  readonly category_color: string | null;
  readonly warranty_end_date: string | null;
  readonly warranty_status: WarrantyStatus | null;
  readonly return_deadline: string | null;
  readonly primary_image_path: string | null;
}
