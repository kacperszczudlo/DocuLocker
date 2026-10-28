import type { SqlDatabase } from '@/database/connection';
import { FileStorageService } from '@/services/storage/fileStorageService';
import { NotificationService } from '@/services/notifications/notificationService';

/**
 * Serwis umozliwiajacy calkowite usuniecie wszystkich danych uzytkownika (Zero-Data Data Purge).
 *
 * Realizuje wytyczne RODO oraz Google Play Developer Policy w zakresie prawa do bycia zapomnianym
 * i kontroli uzytkownika nad danymi przechowywanymi lokalnie w piaskownicy aplikacji.
 */
export class DataPurgeService {
  private readonly db: SqlDatabase;
  private readonly fileStorage: FileStorageService;
  private readonly notifications: NotificationService;

  constructor(
    db: SqlDatabase,
    fileStorage?: FileStorageService,
    notifications?: NotificationService
  ) {
    this.db = db;
    this.fileStorage = fileStorage ?? new FileStorageService();
    this.notifications = notifications ?? new NotificationService();
  }

  /**
   * Trwale usuwa wszystkie zapisane paragony, dokumenty, relacje gwarancyjne,
   * indeksy wyszukiwania pelnotekstowego FTS5, pliki obrazow oraz anuluje alerty.
   */
  async purgeAllUserData(): Promise<void> {
    try {
      // 1. Czyszczenie tabel relacyjnych i indeksow FTS5
      await this.db.runAsync('DELETE FROM documents_fts;');
      await this.db.runAsync('DELETE FROM warranties;');
      await this.db.runAsync('DELETE FROM documents;');
      await this.db.runAsync('DELETE FROM stores;');
    } catch (err) {
      console.warn('[DocuLocker] Ostrzezenie podczas czyszczenia tabel SQLite:', err);
    }

    // 2. Usuniecie wszystkich plikow zdjec z dedykowanego katalogu
    try {
      await this.fileStorage.deleteAllReceipts();
    } catch (err) {
      console.warn('[DocuLocker] Ostrzezenie podczas usuwania plikow paragonow:', err);
    }

    // 3. Anulowanie wszystkich zaplanowanych alertow powiadomien
    try {
      await this.notifications.cancelAllAlerts();
    } catch (err) {
      console.warn('[DocuLocker] Ostrzezenie podczas anulowania powiadomien:', err);
    }
  }
}
