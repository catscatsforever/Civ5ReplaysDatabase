const SQLJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3';

const workerCode = `
importScripts('${SQLJS_CDN}/sql-wasm.js');

let db = null;
let SQL = null;

async function ensureSQL() {
  if (!SQL) {
    SQL = await self.initSqlJs({ locateFile: file => '${SQLJS_CDN}/' + file });
  }
  return SQL;
}

// Worker message handler
self.onmessage = async function(e) {
  const { id, action, payload } = e.data;
  try {
    const SqlJs = await ensureSQL();
    switch (action) {

      case 'open': {
        if (db) db.close();
        db = payload && payload.buffer
          ? new SqlJs.Database(new Uint8Array(payload.buffer))
          : new SqlJs.Database();
        self.postMessage({ id, result: { success: true } });
        break;
      }

      case 'exec': {
        if (!db) throw new Error('No database loaded');
        const results = db.exec(payload.sql);
        self.postMessage({ id, result: results });
        break;
      }

      case 'getTables': {
        if (!db) throw new Error('No database loaded');
        const results = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
        const tables  = results.length > 0 ? results[0].values.map(r => r[0]) : [];
        self.postMessage({ id, result: tables });
        break;
      }

      case 'getTableData': {
        if (!db) throw new Error('No database loaded');
        const tableName = payload.table.replace(/[^a-zA-Z0-9_]/g, '');
        const limit     = payload.limit || 1000;
        const results   = db.exec('SELECT * FROM "' + tableName + '" LIMIT ' + limit);
        self.postMessage({ id, result: results });
        break;
      }

      case 'getTableInfo': {
        if (!db) throw new Error('No database loaded');
        const tbl   = payload.table.replace(/[^a-zA-Z0-9_]/g, '');
        const info  = db.exec('PRAGMA table_info("' + tbl + '")');
        const count = db.exec('SELECT COUNT(*) FROM "' + tbl + '"');
        self.postMessage({ id, result: { info, count: count[0]?.values[0][0] || 0 } });
        break;
      }

      case 'export': {
        if (!db) throw new Error('No database loaded');
        const data   = db.export();
        const buffer = data.buffer;
        self.postMessage({ id, result: buffer }, [buffer]);
        break;
      }

      default:
        throw new Error('Unknown action: ' + action);
    }
  } catch (err) {
    self.postMessage({ id, error: err.message });
  }
};
`;

export type WorkerMessage = {
    id: number;
    action: string;
    payload?: any;
};

export type WorkerResponse = {
    id: number;
    result?: any;
    error?: string;
};

export type QueryResult = {
    columns: string[];
    values: any[][];
};

class SqlWorker {
    private worker: Worker;
    private nextId = 0;
    private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

    constructor() {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url  = URL.createObjectURL(blob);
        this.worker = new Worker(url);

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            const { id, result, error } = e.data;
            const p = this.pending.get(id);
            if (p) {
                this.pending.delete(id);
                error ? p.reject(new Error(error)) : p.resolve(result);
            }
        };

        this.worker.onerror = (e) => {
            console.error('[SqlWorker]', e.message ?? e);
            for (const [, p] of this.pending) p.reject(new Error(e.message ?? 'Worker error'));
            this.pending.clear();
        };
    }

    private send(action: string, payload?: any, transfer?: Transferable[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            this.pending.set(id, { resolve, reject });
            const msg: WorkerMessage = { id, action, payload };
            transfer ? this.worker.postMessage(msg, transfer) : this.worker.postMessage(msg);
        });
    }

    async open(buffer?: ArrayBuffer): Promise<void> {
        buffer ? await this.send('open', { buffer }, [buffer]) : await this.send('open');
    }
    async exec(sql: string): Promise<QueryResult[]>              { console.log('EXEC', sql); return this.send('exec', { sql }); }
    async getTables(): Promise<string[]>                         { return this.send('getTables'); }
    async getTableData(table: string, limit = 1000): Promise<QueryResult[]> { return this.send('getTableData', { table, limit }); }
    async getTableInfo(table: string): Promise<{ info: QueryResult[]; count: number }> { return this.send('getTableInfo', { table }); }
    async exportDb(): Promise<ArrayBuffer>                       { return this.send('export'); }

    async loadFromUrl(url: string): Promise<void> {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
        const buffer = await resp.arrayBuffer();
        await this.open(buffer);
    }
}

let instance: SqlWorker | null = null;
export function getSqlWorker(): SqlWorker {
    if (!instance) instance = new SqlWorker();
    return instance;
}

export type { SqlWorker };
