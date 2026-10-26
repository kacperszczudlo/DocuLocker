import * as FileSystem from 'expo-file-system/legacy';

/** Interfejs abstrakcji systemu plikow urzadzenia ulatwiajacy mockowanie w testach jednostkowych. */
export interface FileSystemDriver {
  /** Katalog dokumentow dedykowany aplikacji w pamieci wewnetrznej sandboxu. */
  documentDirectory: string | null;
  /** Tworzy katalog pod podana sciezka. */
  makeDirectoryAsync(dir: string, options?: { intermediates?: boolean }): Promise<void>;
  /** Kopiuje plik ze zrodla do miejsca docelowego. */
  copyAsync(options: { from: string; to: string }): Promise<void>;
  /** Usuwa plik lub katalog z dysku. */
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  /** Pobiera metadane pliku (istnienie, rozmiar w bajtach). */
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }>;
}

/**
 * Serwis lokalnego magazynu plikow paragonow (FileStorageService).
 *
 * Odpowiada za:
 * - Izolacje zdjec w dedykowanym podkatalogu `receipts/` w pamieci wewnetrznej aplikacji.
 * - Bezpieczne kopiowanie tymczasowych zdjec z aparatu do magazynu trwalego.
 * - Idempotentne usuwanie plikow skojarzonych z usuwanymi dokumentami.
 */
export class FileStorageService {
  private readonly driver: FileSystemDriver;
  private readonly receiptsDirName = 'receipts/';

  /**
   * Tworzy instancje serwisu magazynu plikow.
   *
   * @param driver Opcjonalny sterownik systemu plikow (domyslnie expo-file-system).
   */
  constructor(driver?: FileSystemDriver) {
    this.driver = driver ?? (FileSystem as unknown as FileSystemDriver);
  }

  /**
   * Zwraca pelna sciezke katalogu przechowywania skanow i zdjec paragonow.
   *
   * @returns Sciezka URI katalogu `receipts/`.
   */
  getReceiptDirectory(): string {
    const baseDir = this.driver.documentDirectory ?? '';
    return baseDir.endsWith('/') ? `${baseDir}${this.receiptsDirName}` : `${baseDir}/${this.receiptsDirName}`;
  }

  /**
   * Zapewnia istnienie dedykowanego katalogu na dysku, tworzac go w razie potrzeby.
   *
   * @returns Sciezka URI potwierdzonego katalogu.
   */
  async ensureDirectoryExists(): Promise<string> {
    const receiptsDir = this.getReceiptDirectory();
    const info = await this.driver.getInfoAsync(receiptsDir);
    if (!info.exists) {
      await this.driver.makeDirectoryAsync(receiptsDir, { intermediates: true });
    }
    return receiptsDir;
  }

  /**
   * Kopiuje plik tymczasowy do trwalego magazynu aplikacji pod unikalna nazwa.
   *
   * @param sourceUri Tymczasowy URI z aparatu lub selektora plikow.
   * @param customId Opcjonalny identyfikator pliku (np. UUID dokumentu).
   * @returns Trwaly docelowy URI zapisanego pliku.
   */
  async saveReceiptImage(sourceUri: string, customId?: string): Promise<string> {
    const receiptsDir = await this.ensureDirectoryExists();
    const fileId = customId ?? `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const destinationUri = `${receiptsDir}${fileId}.jpg`;

    await this.driver.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    return destinationUri;
  }

  /**
   * Idempotentnie usuwa plik zdjecia paragonu z pamieci masowej urzadzenia.
   *
   * @param targetUri URI pliku przeznaczonego do skasowania.
   */
  async deleteReceiptImage(targetUri: string): Promise<void> {
    if (!targetUri) return;
    try {
      await this.driver.deleteAsync(targetUri, { idempotent: true });
    } catch {
      // Idempotent delete - ignorujemy brak istnienia pliku na dysku
    }
  }
}
