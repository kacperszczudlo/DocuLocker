import * as SQLite from 'expo-sqlite';
import { BASE_DDL_STATEMENTS, FTS_DDL_STATEMENTS, SEED_STATEMENTS } from './schema';

export interface SqlRunResult {
  readonly lastInsertRowId: number;
  readonly changes: number;
}

export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<SqlRunResult>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const TARGET_SCHEMA_VERSION = 1;

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

export function setDatabaseInstanceForTesting(mockDb: SqlDatabase | null): void {
  activeDbInstance = mockDb;
}
