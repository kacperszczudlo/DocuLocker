import initSqlJs from 'sql.js';
import { SqlDatabase, SqlRunResult } from '@/database/connection';

function normalizeParams(params: unknown[]): (string | number | null)[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0] as (string | number | null)[];
  }
  return params as (string | number | null)[];
}

export async function createInMemoryTestDatabase(): Promise<SqlDatabase> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  return {
    async execAsync(sql: string): Promise<void> {
      db.run(sql);
    },
    async runAsync(sql: string, ...params: unknown[]): Promise<SqlRunResult> {
      const normalized = normalizeParams(params);
      db.run(sql, normalized);
      const lastIdRes = db.exec('SELECT last_insert_rowid() as id;');
      const lastId = (lastIdRes[0]?.values[0]?.[0] as number) ?? 0;
      const changesRes = db.exec('SELECT changes() as changes;');
      const changes = (changesRes[0]?.values[0]?.[0] as number) ?? 0;

      return {
        lastInsertRowId: lastId,
        changes,
      };
    },
    async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      const stmt = db.prepare(sql);
      const normalized = normalizeParams(params);
      stmt.bind(normalized);
      if (stmt.step()) {
        const row = stmt.getAsObject() as T;
        stmt.free();
        return row;
      }
      stmt.free();
      return null;
    },
    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const results: T[] = [];
      const stmt = db.prepare(sql);
      const normalized = normalizeParams(params);
      stmt.bind(normalized);
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return results;
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      db.run('BEGIN TRANSACTION;');
      try {
        await task();
        db.run('COMMIT;');
      } catch (error) {
        db.run('ROLLBACK;');
        throw error;
      }
    },
  };
}
