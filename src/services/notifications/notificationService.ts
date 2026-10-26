import * as Notifications from 'expo-notifications';
import { addDaysToIsoDate } from '@/core/warranties/warrantyCalculator';

/** Parametry planowania alertow gwarancyjnych i terminow zwrotu. */
export interface ScheduleWarrantyAlertsParams {
  /** Unikalny identyfikator dokumentu UUID. */
  readonly documentId: string;
  /** Tytul zakupu prezentowany w powiadomieniu. */
  readonly title: string;
  /** Data konca gwarancji (YYYY-MM-DD). */
  readonly warrantyEndDate: string;
  /** Opcjonalna graniczna data zwrotu towaru (YYYY-MM-DD). */
  readonly returnDeadline?: string;
  /** Opcjonalna nazwa sklepu. */
  readonly storeName?: string | null;
  /** Godzina wyzwolenia alertu w formacie 24h (domyslnie 10 rano). */
  readonly alertHour?: number;
}

/** Rezultat zaplanowania lokalnych powiadomien w systemie operacyjnym. */
export interface ScheduledAlertResult {
  /** Identyfikator powiadomienia na 30 dni przed koncem gwarancji (lub null jesli termin minal). */
  readonly alert30dId: string | null;
  /** Identyfikator powiadomienia na 7 dni przed koncem gwarancji (lub null). */
  readonly alert7dId: string | null;
  /** Identyfikator powiadomienia na 2 dni przed koncem okna zwrotu (lub null). */
  readonly returnAlertId: string | null;
}

/** Interfejs sterownika powiadomien umozliwiajacy wstrzykiwanie mockow w testach. */
export interface NotificationDriver {
  requestPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  scheduleNotificationAsync(request: {
    content: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      sound?: boolean;
    };
    trigger: Date | { date: Date };
  }): Promise<string>;
  cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  getAllScheduledNotificationsAsync(): Promise<
    Array<{
      identifier: string;
      content: { data?: Record<string, unknown> };
    }>
  >;
}

// Konfiguracja wyswietlania powiadomien na pierwszym planie (foreground)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Ignorujemy w srodowisku bez wsparcia natywnego (np. testy jednostkowe Node)
}

/**
 * Serwis lokalnych powiadomien i alarmow gwarancyjnych (NotificationService).
 *
 * Odpowiada za:
 * - Uzyskanie zgody uzytkownika na wyswietlanie powiadomien lokalnych.
 * - Wyliczanie punktow czasowych alertow: 30 dni przed koncem gwarancji,
 *   7 dni przed koncem gwarancji oraz 2 dni przed uplywem prawa do zwrotu.
 * - Odwolywanie powiadomien w przypadku usuniecia lub modyfikacji dokumentu.
 */
export class NotificationService {
  private readonly driver: NotificationDriver;

  /**
   * Inicjalizuje serwis powiadomien ze sterownikiem natywnym lub atrapa testowa.
   *
   * @param driver Opcjonalny sterownik kompatybilny z expo-notifications.
   */
  constructor(driver?: NotificationDriver) {
    this.driver = driver ?? (Notifications as unknown as NotificationDriver);
  }

  /**
   * Sprawdza i w razie potrzeby prosi uzytkownika o uprawnienia do wysylania powiadomien.
   *
   * @returns Wartosc true jesli system przyznal uprawnienia.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const response = await this.driver.requestPermissionsAsync();
      return response.granted || response.status === 'granted';
    } catch (err) {
      console.warn('[DocuLocker] Blad podczas zapytania o uprawnienia powiadomien:', err);
      return false;
    }
  }

  /**
   * Planuje powiadomienia o konczacej sie gwarancji oraz uplywie terminu zwrotu.
   * Automatycznie filtruje daty z przeszlosci.
   *
   * @param params Metadane zakupu i terminy gwarancyjne.
   * @param referenceNow Opcjonalny biezacy znacznik czasu (do testow jednostkowych).
   * @returns Identyfikatory zarejestrowanych powiadomien w systemie.
   */
  async scheduleWarrantyAlerts(
    params: ScheduleWarrantyAlertsParams,
    referenceNow: Date = new Date()
  ): Promise<ScheduledAlertResult> {
    // 1. Najpierw usuwamy ewentualne wczesniej zaplanowane alerty dla tego dokumentu
    await this.cancelAlertsForDocument(params.documentId);

    const alertHour = params.alertHour ?? 10;
    let alert30dId: string | null = null;
    let alert7dId: string | null = null;
    let returnAlertId: string | null = null;

    // A. Alert na 30 dni przed koncem gwarancji
    const date30dIso = addDaysToIsoDate(params.warrantyEndDate, -30);
    const triggerDate30d = this.createTriggerDate(date30dIso, alertHour);

    if (triggerDate30d.getTime() > referenceNow.getTime()) {
      try {
        alert30dId = await this.driver.scheduleNotificationAsync({
          content: {
            title: 'DocuLocker: Gwarancja wygasa za 30 dni',
            body: `Kończy się okres rękojmi/gwarancji dla "${params.title}". Sprawdź stan urządzenia!`,
            data: {
              documentId: params.documentId,
              alertType: 'WARRANTY_30D',
            },
            sound: true,
          },
          trigger: triggerDate30d,
        });
      } catch (err) {
        console.warn('[DocuLocker] Nie udalo sie zaplanowac alertu 30d:', err);
      }
    }

    // B. Alert na 7 dni przed koncem gwarancji
    const date7dIso = addDaysToIsoDate(params.warrantyEndDate, -7);
    const triggerDate7d = this.createTriggerDate(date7dIso, alertHour);

    if (triggerDate7d.getTime() > referenceNow.getTime()) {
      try {
        alert7dId = await this.driver.scheduleNotificationAsync({
          content: {
            title: 'DocuLocker: Ostatnie 7 dni gwarancji!',
            body: `Za tydzień mija ochrona gwarancyjna dla "${params.title}". To ostatni moment na bezpłatną naprawę.`,
            data: {
              documentId: params.documentId,
              alertType: 'WARRANTY_7D',
            },
            sound: true,
          },
          trigger: triggerDate7d,
        });
      } catch (err) {
        console.warn('[DocuLocker] Nie udalo sie zaplanowac alertu 7d:', err);
      }
    }

    // C. Alert na 2 dni przed terminem zwrotu (jesli zdefiniowano)
    if (params.returnDeadline) {
      const returnAlertDateIso = addDaysToIsoDate(params.returnDeadline, -2);
      const triggerReturn = this.createTriggerDate(returnAlertDateIso, alertHour);

      if (triggerReturn.getTime() > referenceNow.getTime()) {
        try {
          const storeInfo = params.storeName ? ` w sklepie ${params.storeName}` : '';
          returnAlertId = await this.driver.scheduleNotificationAsync({
            content: {
              title: 'DocuLocker: Kończy się czas na zwrot!',
              body: `Pozostały 2 dni na bezproblemowy zwrot "${params.title}"${storeInfo}.`,
              data: {
                documentId: params.documentId,
                alertType: 'RETURN_DEADLINE',
              },
              sound: true,
            },
            trigger: triggerReturn,
          });
        } catch (err) {
          console.warn('[DocuLocker] Nie udalo sie zaplanowac alertu zwrotu:', err);
        }
      }
    }

    return {
      alert30dId,
      alert7dId,
      returnAlertId,
    };
  }

  /**
   * Anuluje wszystkie aktywne powiadomienia systemowe powiazane z danym dokumentem.
   *
   * @param documentId Unikalny identyfikator dokumentu UUID.
   */
  async cancelAlertsForDocument(documentId: string): Promise<void> {
    try {
      const scheduled = await this.driver.getAllScheduledNotificationsAsync();
      const documentAlerts = scheduled.filter(
        (notif) => notif.content.data?.documentId === documentId
      );

      for (const alert of documentAlerts) {
        await this.driver.cancelScheduledNotificationAsync(alert.identifier);
      }
    } catch (err) {
      console.warn(`[DocuLocker] Blad podczas anulowania powiadomien dla dokumentu ${documentId}:`, err);
    }
  }

  /**
   * Tworzy obiekt Date dla podanego dnia ISO o zadanej godzinie lokalnej.
   *
   * @param isoDate Data w formacie YYYY-MM-DD.
   * @param hour Godzina w formacie 24h.
   */
  private createTriggerDate(isoDate: string, hour: number): Date {
    const [year, month, day] = isoDate.split('-').map((v) => parseInt(v, 10));
    return new Date(year, month - 1, day, hour, 0, 0, 0);
  }
}
