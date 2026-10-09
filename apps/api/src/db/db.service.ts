import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { APP_CONFIG, AppConfig } from '../config';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.pool = new Pool({ connectionString: config.databaseUrl, max: 20 });
  }

  query<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params as any[]);
  }

  /** Runs fn inside a READ COMMITTED transaction; rolls back on any error. */
  async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  onModuleDestroy() {
    return this.pool.end();
  }
}
