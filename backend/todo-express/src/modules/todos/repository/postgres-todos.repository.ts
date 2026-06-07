import { Types } from 'mongoose';
import { ITodo, TodoStatus } from '../schemas/todo.model';
import { ListTodosQuery } from '../validators/todo.validators';
import { ITodosRepository, TodoListResult } from './todos-repository.interface';
import { ConflictError, NotFoundError } from '../../../common/errors/http-error';
import { getPool } from '../../../db/postgres';

function rowToITodo(row: Record<string, unknown>): ITodo {
  return {
    _id: row['id'] as unknown as Types.ObjectId,
    title: row['title'] as string,
    description: row['description'] as string | undefined,
    dueDate: row['due_date'] ? new Date(row['due_date'] as string) : undefined,
    status: row['status'] as TodoStatus,
    priority: row['priority'] as number,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
    __v: row['version'] as number,
  };
}

export class PostgresTodosRepository implements ITodosRepository {
  async create(data: Partial<ITodo>): Promise<ITodo> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO todos (title, description, due_date, status, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.title,
        data.description ?? null,
        data.dueDate ?? null,
        data.status ?? TodoStatus.TODO,
        data.priority ?? 3,
      ],
    );
    return rowToITodo(rows[0] as Record<string, unknown>);
  }

  async findAll(query: ListTodosQuery): Promise<TodoListResult> {
    const pool = getPool();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    let dataQuery: string;
    let countQuery: string;
    let params: unknown[];

    if (query.status) {
      dataQuery = `SELECT * FROM todos WHERE status=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      countQuery = `SELECT COUNT(*) FROM todos WHERE status=$1`;
      params = [query.status, limit, offset];
    } else {
      dataQuery = `SELECT * FROM todos ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      countQuery = `SELECT COUNT(*) FROM todos`;
      params = [limit, offset];
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, query.status ? [query.status] : []),
    ]);

    return {
      items: (dataResult.rows as Record<string, unknown>[]).map(rowToITodo),
      total: parseInt((countResult.rows[0] as Record<string, unknown>)['count'] as string, 10),
      page,
      limit,
    };
  }

  async findByIdLean(id: string): Promise<ITodo | null> {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM todos WHERE id=$1`, [id]);
    if (rows.length === 0) return null;
    return rowToITodo(rows[0] as Record<string, unknown>);
  }

  async updateById(id: string, patches: Partial<ITodo>, expectedVersion?: number): Promise<ITodo> {
    const pool = getPool();

    let sql: string;
    let queryParams: unknown[];

    if (expectedVersion !== undefined) {
      sql = `
        UPDATE todos
        SET
          title       = COALESCE($2, title),
          description = COALESCE($3, description),
          due_date    = COALESCE($4, due_date),
          status      = COALESCE($5, status),
          priority    = COALESCE($6, priority),
          version     = version + 1,
          updated_at  = NOW()
        WHERE id = $1 AND version = $7
        RETURNING *
      `;
      queryParams = [
        id,
        patches.title ?? null,
        patches.description ?? null,
        patches.dueDate ?? null,
        patches.status ?? null,
        patches.priority ?? null,
        expectedVersion,
      ];
    } else {
      sql = `
        UPDATE todos
        SET
          title       = COALESCE($2, title),
          description = COALESCE($3, description),
          due_date    = COALESCE($4, due_date),
          status      = COALESCE($5, status),
          priority    = COALESCE($6, priority),
          version     = version + 1,
          updated_at  = NOW()
        WHERE id = $1
        RETURNING *
      `;
      queryParams = [
        id,
        patches.title ?? null,
        patches.description ?? null,
        patches.dueDate ?? null,
        patches.status ?? null,
        patches.priority ?? null,
      ];
    }

    const { rows } = await pool.query(sql, queryParams);

    if (rows.length === 0) {
      if (expectedVersion !== undefined) {
        // Check whether the row exists at all to distinguish NotFound vs Conflict
        const { rows: existRows } = await pool.query(`SELECT id FROM todos WHERE id=$1`, [id]);
        if (existRows.length > 0) {
          throw new ConflictError('Version conflict. Please reload and try again.');
        }
      }
      throw new NotFoundError('Todo not found');
    }

    return rowToITodo(rows[0] as Record<string, unknown>);
  }

  async deleteById(id: string): Promise<ITodo | null> {
    const pool = getPool();
    const { rows } = await pool.query(`DELETE FROM todos WHERE id=$1 RETURNING *`, [id]);
    if (rows.length === 0) return null;
    return rowToITodo(rows[0] as Record<string, unknown>);
  }
}
