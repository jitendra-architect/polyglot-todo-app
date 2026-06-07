import { Pool } from 'pg';
import { logger } from '../common/logger';

let _pool: Pool | null = null;

export async function connectPostgres(connectionString: string): Promise<void> {
  _pool = new Pool({ connectionString });

  await _pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      description TEXT,
      due_date TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'todo',
      priority INTEGER NOT NULL DEFAULT 3,
      version INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await _pool.query(`CREATE INDEX IF NOT EXISTS idx_todos_status_due_date ON todos(status, due_date)`);

  logger.info('PostgreSQL connected');
}

export async function disconnectPostgres(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export function getPool(): Pool {
  if (!_pool) throw new Error('PostgreSQL not connected');
  return _pool;
}
