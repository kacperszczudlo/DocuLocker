import { DocumentRepository } from '@/database/repositories/documentRepository';
import { StoreRepository } from '@/database/repositories/storeRepository';
import { FileStorageService } from '@/services/storage/fileStorageService';
import { NotificationService } from '@/services/notifications/notificationService';
import { WarrantyCalculator } from '@/core/warranties/warrantyCalculator';
import { DocumentType } from '@/database/types';

/** Parametry wejsciowe zapisu dokumentu fiskalnego lub faktury. */
export interface SaveDocumentInput {
  /** Tytul nadany przez uzytkownika lub wygenerowany automatycznie. */
  readonly title: string;
  /** Opcjonalna nazwa punktu handlowego. */
  readonly storeName?: string | null;
  /** Opcjonalny NIP wystawcy dokumentu. */
  readonly taxId?: string | null;
  /** Identyfikator przypisanej kategorii wydatku. */
  readonly categoryId?: number | null;
  /** Laczna kwota transakcji. */
  readonly totalAmount: number;
  /** Kod waluty transakcji (domyslnie 'PLN'). */
  readonly currency?: string;
  /** Data zakupu w formacie ISO-8601 (YYYY-MM-DD). */
  readonly purchaseDate: string;
  /** Typ dokumentu (RECEIPT, INVOICE, WARRANTY_CARD, OTHER). */
  readonly documentType?: DocumentType;
  /** Opcjonalne notatki uzytkownika. */
  readonly notes?: string | null;
  /** Surowy tekst OCR zachowywany na potrzeby przeszukiwania pelnotekstowego FTS5. */
  readonly rawOcrText?: string | null;
  /** Liczba miesiecy gwarancji (domyslnie 24). */
  readonly warrantyMonths?: number;
  /** Okno czasowe na zwrot w dniach (domyslnie 14). */
  readonly returnWindowDays?: number;
  /** Tymczasowy URI zdjecia z aparatu do skopiowania do trwalego katalogu aplikacji. */
  readonly tempImageUri?: string | null;
}

/**
 * Bezpieczny generator UUID v4 odporny na srodowiska mobilne (Expo / React Native / Node).
 *
 * @returns Losowy identyfikator UUID w standardowym formacie v4.
 */
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Przypadek uzycia: Trwaly zapis dokumentu (SaveDocumentUseCase).
 *
 * Realizuje orkiestracje zapisu biznesowego:
 * 1. Generuje unikalny UUID dokumentu.
 * 2. Kopiuje i utrwala zdjecie w odizolowanym katalogu aplikacji (`FileStorageService`).
 * 3. Zapewnia istnienie rekordu sklepu w bazie (`StoreRepository`).
 * 4. Zapisuje dokument do relacyjnej bazy SQLite (`DocumentRepository`), co wyzwala indeks FTS5.
 * 5. Wylicza terminy gwarancyjne i planuje lokalne powiadomienia alarmowe (`NotificationService`).
 */
export class SaveDocumentUseCase {
  /**
   * Tworzy instancje orkiestratora zapisu dokumentu.
   *
   * @param documentRepo Repozytorium dokumentow SQLite.
   * @param storeRepo Repozytorium sklepow.
   * @param storageService Serwis magazynu plikow na dysku urzadzenia.
   * @param notificationService Opcjonalny serwis powiadomien lokalnych.
   */
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly storeRepo: StoreRepository,
    private readonly storageService: FileStorageService,
    private readonly notificationService?: NotificationService
  ) {}

  /**
   * Wykonuje transakcyjny proces utrwalenia dokumentu.
   *
   * @param input Zweryfikowane dane dokumentu.
   * @returns Unikalny identyfikator UUID zapisanego dokumentu.
   */
  async execute(input: SaveDocumentInput): Promise<string> {
    const docId = generateUuid();
    let persistentImagePath: string | null = null;

    if (input.tempImageUri) {
      persistentImagePath = await this.storageService.saveReceiptImage(input.tempImageUri, docId);
    }

    let storeId: number | null = null;
    if (input.storeName && input.storeName.trim()) {
      const store = await this.storeRepo.findOrCreateByName(input.storeName.trim(), input.taxId);
      storeId = store.id;
    }

    const warrantyMonths = input.warrantyMonths ?? 24;
    const returnWindowDays = input.returnWindowDays ?? 14;

    await this.documentRepo.createDocument({
      id: docId,
      title: input.title.trim(),
      storeId,
      categoryId: input.categoryId ?? null,
      totalAmount: input.totalAmount,
      currency: input.currency ?? 'PLN',
      purchaseDate: input.purchaseDate,
      documentType: input.documentType ?? 'RECEIPT',
      notes: input.notes ?? null,
      rawOcrText: input.rawOcrText ?? null,
      warrantyMonths,
      returnWindowDays,
      primaryImagePath: persistentImagePath,
    });

    if (this.notificationService) {
      const calculation = WarrantyCalculator.calculate({
        purchaseDate: input.purchaseDate,
        durationMonths: warrantyMonths,
        returnWindowDays,
      });

      await this.notificationService.scheduleWarrantyAlerts({
        documentId: docId,
        title: input.title.trim(),
        warrantyEndDate: calculation.endDate,
        returnDeadline: calculation.returnDeadline,
        storeName: input.storeName,
      });
    }

    return docId;
  }
}
