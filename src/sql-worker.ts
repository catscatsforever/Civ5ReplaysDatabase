// This module creates an inline Web Worker for SQL.js operations.
// We use a Blob URL so it works even with vite-plugin-singlefile.

const SQLJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3';

const workerCode = `
importScripts('${SQLJS_CDN}/sql-wasm.js');

let db = null;

async function initSqlJs() {
  const SQL = await initSqlJs({
    locateFile: file => '${SQLJS_CDN}/' + file
  });
  return SQL;
}

let SQL = null;

async function ensureSQL() {
  if (!SQL) {
    SQL = await self.initSqlJs({ locateFile: file => '${SQLJS_CDN}/' + file });
  }
  return SQL;
}

self.onmessage = async function(e) {
  const { id, action, payload } = e.data;
  
  try {
    const SqlJs = await ensureSQL();
    
    switch (action) {
      case 'open': {
        if (db) db.close();
        if (payload && payload.buffer) {
          db = new SqlJs.Database(new Uint8Array(payload.buffer));
        } else {
          db = new SqlJs.Database();
        }
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
        const tables = results.length > 0 ? results[0].values.map(r => r[0]) : [];
        self.postMessage({ id, result: tables });
        break;
      }
      
      case 'getTableData': {
        if (!db) throw new Error('No database loaded');
        const tableName = payload.table.replace(/[^a-zA-Z0-9_]/g, '');
        const limit = payload.limit || 1000;
        const results = db.exec('SELECT * FROM "' + tableName + '" LIMIT ' + limit);
        self.postMessage({ id, result: results });
        break;
      }
      
      case 'getTableInfo': {
        if (!db) throw new Error('No database loaded');
        const tbl = payload.table.replace(/[^a-zA-Z0-9_]/g, '');
        const info = db.exec('PRAGMA table_info("' + tbl + '")');
        const count = db.exec('SELECT COUNT(*) FROM "' + tbl + '"');
        self.postMessage({ id, result: { info, count: count[0]?.values[0][0] || 0 } });
        break;
      }
      
      case 'export': {
        if (!db) throw new Error('No database loaded');
        const data = db.export();
        const buffer = data.buffer;
        self.postMessage({ id, result: buffer }, [buffer]);
        break;
      }
      
      case 'createDemo': {
        if (db) db.close();
        db = new SqlJs.Database();
        
        db.run(\`
          CREATE TABLE sales (
            id INTEGER PRIMARY KEY,
            month TEXT,
            revenue REAL,
            expenses REAL,
            profit REAL,
            units_sold INTEGER
          )
        \`);
        
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const stmt = db.prepare("INSERT INTO sales VALUES (?,?,?,?,?,?)");
        months.forEach((m, i) => {
          const rev = 10000 + Math.round(Math.random() * 15000);
          const exp = 5000 + Math.round(Math.random() * 8000);
          stmt.run([i+1, m, rev, exp, rev - exp, 100 + Math.round(Math.random() * 400)]);
        });
        stmt.free();
        
        db.run(\`
          CREATE TABLE employees (
            id INTEGER PRIMARY KEY,
            name TEXT,
            department TEXT,
            salary REAL,
            hire_year INTEGER,
            performance_score REAL
          )
        \`);
        
        const names = ['Alice','Bob','Charlie','Diana','Eve','Frank','Grace','Henry','Iris','Jack',
                       'Karen','Leo','Mona','Nate','Olivia','Paul','Quinn','Rose','Sam','Tina'];
        const depts = ['Engineering','Marketing','Sales','HR','Finance'];
        const stmt2 = db.prepare("INSERT INTO employees VALUES (?,?,?,?,?,?)");
        names.forEach((n, i) => {
          stmt2.run([i+1, n, depts[i % depts.length], 50000 + Math.round(Math.random() * 80000), 2015 + Math.floor(Math.random() * 9), Math.round((3 + Math.random() * 2) * 10) / 10]);
        });
        stmt2.free();
        
        db.run(\`
          CREATE TABLE website_traffic (
            id INTEGER PRIMARY KEY,
            day TEXT,
            page_views INTEGER,
            unique_visitors INTEGER,
            bounce_rate REAL,
            avg_session_min REAL
          )
        \`);
        
        const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const stmt3 = db.prepare("INSERT INTO website_traffic VALUES (?,?,?,?,?,?)");
        days.forEach((d, i) => {
          const pv = 2000 + Math.round(Math.random() * 5000);
          stmt3.run([i+1, d, pv, Math.round(pv * (0.4 + Math.random()*0.3)), Math.round((30 + Math.random() * 40)*10)/10, Math.round((1 + Math.random() * 5)*10)/10]);
        });
        stmt3.free();
        
        self.postMessage({ id, result: { success: true } });
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
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);

    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, result, error } = e.data;
        const p = this.pending.get(id);
        if (p) {
            this.pending.delete(id);
            if (error) {
                p.reject(new Error(error));
            } else {
                p.resolve(result);
            }
        }
    };
}

private send(action: string, payload?: any, transfer?: Transferable[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const id = this.nextId++;
        this.pending.set(id, { resolve, reject });
        const msg: WorkerMessage = { id, action, payload };
        if (transfer) {
            this.worker.postMessage(msg, transfer);
        } else {
            this.worker.postMessage(msg);
        }
    });
}

async open(buffer?: ArrayBuffer): Promise<void> {
    if (buffer) {
        await this.send('open', { buffer }, [buffer]);
    } else {
        await this.send('open');
    }
}

async exec(sql: string): Promise<QueryResult[]> {
    return this.send('exec', { sql });
}

async getTables(): Promise<string[]> {
    return this.send('getTables');
}

async getTableData(table: string, limit = 1000): Promise<QueryResult[]> {
    return this.send('getTableData', { table, limit });
}

async getTableInfo(table: string): Promise<{ info: QueryResult[]; count: number }> {
    return this.send('getTableInfo', { table });
}

async exportDb(): Promise<ArrayBuffer> {
    return this.send('export');
}

async createDemo(): Promise<void> {
    await this.send('createDemo');
}
}

// Singleton
let instance: SqlWorker | null = null;
export function getSqlWorker(): SqlWorker {
    if (!instance) {
        instance = new SqlWorker();
    }
    return instance;
}

export type { SqlWorker };
