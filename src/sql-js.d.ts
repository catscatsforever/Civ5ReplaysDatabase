declare module "sql.js" {
    interface Database {
        run(sql: string, params?: unknown[]): Database;
        exec(sql: string): { columns: string[]; values: unknown[][] }[];
        export(): Uint8Array;
        close(): void;
    }

    interface SqlJsStatic {
        Database: new (data?: ArrayLike<number>) => Database;
    }

    interface Config {
        locateFile?: (file: string) => string;
        wasmBinary?: ArrayBuffer;
    }

    export type { Database, SqlJsStatic };
    export default function initSqlJs(config?: Config): Promise<SqlJsStatic>;
}

declare module "sql.js/dist/sql-wasm.wasm?url" {
    const url: string;
    export default url;
}

declare module "sql.js/dist/worker.sql-wasm.js?url" {
    const url: string;
    export default url;
}

// worker.sql-wasm.wasm is identical to sql-wasm.wasm; we import the latter.
