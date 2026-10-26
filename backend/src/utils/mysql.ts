import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const pool: Pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  dateStrings: false,
});

type ModelName = 'user' | 'team' | 'task' | 'announcement' | 'attendance' | 'leaveRequest';
const tables: Record<ModelName, string> = {
  user: 'User', team: 'Team', task: 'Task', announcement: 'Announcement',
  attendance: 'Attendance', leaveRequest: 'LeaveRequest',
};
let transactionConnection: PoolConnection | undefined;

const column = (name: string) => name;
const value = (v: unknown): unknown => v instanceof Date ? v : v;

function whereSql(where: any, params: unknown[], prefix = ''): string {
  if (!where || Object.keys(where).length === 0) return '1=1';
  const parts: string[] = [];
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'OR' || key === 'AND') {
      const values = condition as any[];
      const joiner = key === 'OR' ? ' OR ' : ' AND ';
      parts.push(`(${values.map((v) => whereSql(v, params, prefix)).join(joiner)})`);
      continue;
    }
    if (key === 'NOT') { parts.push(`NOT (${whereSql(condition, params, prefix)})`); continue; }
    if (condition === undefined) continue;
    const field = `${prefix}\`${column(key)}\``;
    if (condition === null) { parts.push(`${field} IS NULL`); continue; }
    if (typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof Date)) {
      if ('in' in condition) { const list = (condition as any).in; parts.push(`${field} IN (${list.map(() => '?').join(',')})`); params.push(...list); }
      else if ('contains' in condition) { parts.push(`${field} LIKE ?`); params.push(`%${(condition as any).contains}%`); }
      else if ('startsWith' in condition) { parts.push(`${field} LIKE ?`); params.push(`${(condition as any).startsWith}%`); }
      else if ('equals' in condition) { parts.push(`${field} = ?`); params.push((condition as any).equals); }
      else if ('not' in condition) { parts.push(`${field} <> ?`); params.push((condition as any).not); }
      else if ('some' in condition) parts.push(whereSql((condition as any).some, params, prefix));
      else parts.push(whereSql(condition, params, prefix));
    } else { parts.push(`${field} = ?`); params.push(value(condition)); }
  }
  return parts.length ? parts.join(' AND ') : '1=1';
}

class SqlModel {
  constructor(private readonly name: ModelName) {}
  async findMany(args: any = {}, connection: Pool | PoolConnection = transactionConnection || pool): Promise<any[]> {
    const params: unknown[] = [];
    let sql = `SELECT * FROM \`${tables[this.name]}\` WHERE ${whereSql(args.where, params)}`;
    if (args.orderBy) {
      const order = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
      sql += ` ORDER BY ${order.map((o: any) => `${column(Object.keys(o)[0])} ${Object.values(o)[0]}`).join(', ')}`;
    }
    if (args.take !== undefined) sql += ` LIMIT ${Number(args.take)}`;
    const [rows] = await connection.query<RowDataPacket[]>(sql, params);
    const hydrated = await this.hydrate(rows, args.include, connection);
    return args.select ? hydrated.map((row) => this.project(row, args.select)) : hydrated;
  }
  async findFirst(args: any = {}): Promise<any> { return (await this.findMany({ ...args, take: 1 }))[0] || null; }
  async findUnique(args: any = {}): Promise<any> {
    const where = args.where || {};
    const normalized = where.userId_date ? { userId: where.userId_date.userId, date: where.userId_date.date } :
      where.id || where.email || where.username || where.name ? where : where;
    return (await this.findMany({ where: normalized, include: args.include, select: args.select, take: 1 }))[0] || null;
  }
  async count(args: any = {}): Promise<number> {
    const params: unknown[] = [];     const [rows] = await (transactionConnection || pool).query<RowDataPacket[]>(`SELECT COUNT(*) count FROM \`${tables[this.name]}\` WHERE ${whereSql(args.where, params)}`, params);
    return Number(rows[0].count);
  }
  async create(args: any): Promise<any> {
    const data = { ...args.data, id: args.data.id || randomUUID() };
    const keys = Object.keys(data); const params = keys.map((k) => value(data[k]));
    await (transactionConnection || pool).query(`INSERT INTO \`${tables[this.name]}\` (${keys.map((k) => `\`${column(k)}\``).join(',')}) VALUES (${keys.map(() => '?').join(',')})`, params);
    return this.findUnique({ where: { id: data.id }, include: args.include });
  }
  async createMany(args: any): Promise<void> {
    for (const data of args.data || []) await this.create({ data });
  }
  async update(args: any): Promise<any> {
    const keys = Object.keys(args.data); const params = keys.map((k) => value(args.data[k]));
    const whereParams: unknown[] = []; const where = whereSql(args.where, whereParams);
    await (transactionConnection || pool).query(`UPDATE \`${tables[this.name]}\` SET ${keys.map((k) => `\`${column(k)}\` = ?`).join(',')}, \`updatedAt\` = CURRENT_TIMESTAMP WHERE ${where}`, [...params, ...whereParams]);
    return this.findUnique({ where: args.where, include: args.include, select: args.select });
  }
  async delete(args: any): Promise<void> { const p: unknown[] = []; await (transactionConnection || pool).query(`DELETE FROM \`${tables[this.name]}\` WHERE ${whereSql(args.where, p)}`, p); }
  async deleteMany(args: any = {}): Promise<void> { return this.delete({ where: args.where || {} }); }
  async upsert(args: any): Promise<any> {
    const found = await this.findUnique({ where: args.where });
    return found ? this.update({ where: args.where, data: args.update, include: args.include }) : this.create({ data: args.create, include: args.include });
  }
  private async hydrate(rows: any[], include: any, connection: Pool | PoolConnection): Promise<any[]> {
    if (!include) return rows;
    return Promise.all(rows.map(async (row) => {
      const out = { ...row };
      for (const [relation, options] of Object.entries(include)) {
        const opt: any = options === true ? {} : options;
        const related = await this.relation(row, relation, opt, connection);
        out[relation] = opt.take === 1 ? related[0] || null : related;
      }
      if (include && !Object.keys(include).length) return row;
      return out;
    }));
  }
  private project(row: any, select: any): any {
    const out: any = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (enabled === true) out[key] = row[key];
    }
    return out;
  }
  private async relation(row: any, relation: string, options: any, connection: Pool | PoolConnection): Promise<any[]> {
    const map: Record<string, [ModelName, string, string, boolean]> = {
      team: ['team', 'id', 'teamId', false], lead: ['user', 'id', 'leadId', false],
      members: ['user', 'teamId', 'id', false], tasks: ['task', 'teamId', 'id', false],
      user: ['user', 'id', 'userId', false], createdBy: ['user', 'id', 'createdById', false],
      author: ['user', 'id', 'authorId', false], reviewedBy: ['user', 'id', 'reviewedById', false],
      attendances: ['attendance', 'userId', 'id', false], leaveRequests: ['leaveRequest', 'userId', 'id', false],
      reviewedLeaves: ['leaveRequest', 'reviewedById', 'id', false], ledTeams: ['team', 'leadId', 'id', false],
    };
    const spec = map[relation]; if (!spec) return [];
    const [model, foreign, local] = spec; const args: any = { where: { [foreign]: row[local] }, include: options.include, orderBy: options.orderBy, take: options.take };
    const related = await new SqlModel(model).findMany(args, connection);
    return options.select ? related.map((item) => this.project(item, options.select)) : related;
  }
}

export const db = {
  user: new SqlModel('user'), team: new SqlModel('team'), task: new SqlModel('task'),
  announcement: new SqlModel('announcement'), attendance: new SqlModel('attendance'),
  leaveRequest: new SqlModel('leaveRequest'),
  $transaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
    const conn = await pool.getConnection();
    try { transactionConnection = conn; await conn.beginTransaction(); const result = await fn(db); await conn.commit(); return result; }
    catch (error) { await conn.rollback(); throw error; } finally { transactionConnection = undefined; conn.release(); }
  },
  $disconnect: async (): Promise<void> => { await pool.end(); },
};
