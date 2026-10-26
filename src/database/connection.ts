import * as SQLite from 'expo-sqlite';
import { BASE_DDL_STATEMENTS, FTS_DDL_STATEMENTS, SEED_STATEMENTS } from './schema';

/** Wynik wykonania zapytania modyfikujacego stan bazy danych (INSERT, UPDATE, DELETE). */
export interface SqlRunResult {
  /** Identyfikator ostatnio wstawionego wiersza autoincrement. */
  readonly lastInsertRowId: number;
  /** Liczba zmodyfikowanych wierszy. */
  readonly changes: number;
}

/**
 * Zunifikowany interfejs sterownika SQLite (SqlDatabase).
 * Kompatybilny zarowno z natywnym `expo-sqlite`, jak i atrapami testowymi (better-sqlite3).
 */
export interface SqlDatabase {
  /** Wykonuje ciag zapytan DDL/DML bez parametrow powiazanych. */
  execAsync(sql: string): Promise<void>;
  /** Wykonuje sparametryzowane zapytanie DML i zwraca liczbe zmian oraz ID wstawionego wiersza. */
  runAsync(sql: string, ...params: unknown[]): Promise<SqlRunResult>;
  /** Zwraca pierwszy wiersz wyniku lub null. */
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  /** Zwraca wszystkie wiersze pasujace do zapytania. */
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  /** Uruchamia zadanie wewnatrz atomowej transakcji bazodanowej. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Aktualna docelowa wersja schematu aplikacji. */
export const TARGET_SCHEMA_VERSION = 1;

/**
 * Inicjalizuje strukture bazy danych SQLite, wlacza pragmy wydajnosciowe
 * i przeprowadza migracje do docelowej wersji `TARGET_SCHEMA_VERSION`.
 *
 * @param db Instancja polaczenia bazy danych SQLite.
 */
export async function initializeDatabase(db: SqlDatabase): Promise<void> {
  // 1. Wlaczenie obslugi kluczy obcych i trybu WAL
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // 2. Weryfikacja biezacej wersji schematu
  const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion < TARGET_SCHEMA_VERSION) {
    await db.withTransactionAsync(async () => {
      // Wykonanie bazowych tabel i indeksow
      for (const statement of BASE_DDL_STATEMENTS) {
        await db.execAsync(statement);
      }

      // Proba wdrozenia modulu FTS5 wraz z triggerami
      try {
        for (const ftsStatement of FTS_DDL_STATEMENTS) {
          await db.execAsync(ftsStatement);
        }
      } catch (err: unknown) {
        // Pomijamy FTS5 jesli silnik SQLite nie ma wkompilowanego tego modulu
      }

      // Wykonanie danych poczatkowych (seed)
      for (const seed of SEED_STATEMENTS) {
        await db.execAsync(seed);
      }

      // Aktualizacja wersji w bazie
      await db.execAsync(`PRAGMA user_version = ${TARGET_SCHEMA_VERSION};`);
    });
  }
}

let activeDbInstance: SqlDatabase | null = null;

/**
 * Pobiera aktywny singleton polaczenia z lokalna baza danych SQLite.
 * Jezeli baza nie byla jeszcze otwarta, automatycznie wykonuje bootstrap schematu.
 *
 * @returns Instancja polaczenia z baza danych `SqlDatabase`.
 */
export async function getDatabase(): Promise<SqlDatabase> {
  if (activeDbInstance) {
    return activeDbInstance;
  }

  const dbName = process.env.EXPO_PUBLIC_DATABASE_NAME || 'doculocker_local.db';
  const nativeDb = await SQLite.openDatabaseAsync(dbName);

  await initializeDatabase(nativeDb as unknown as SqlDatabase);
  activeDbInstance = nativeDb as unknown as SqlDatabase;
  return activeDbInstance;
}

/**
 * Umozliwia wstrzykniecie mocka bazy w testach jednostkowych lub zresetowanie singletona.
 *
 * @param mockDb Obiekt mockujacy baze lub null w celu wyczyszczenia instancji.
 */
export function setDatabaseInstanceForTesting(mockDb: SqlDatabase | null): void {
  activeDbInstance = mockDb;
}
