// ponytail: minimal local typing for the sql.js surface we use; swap for @types/sql.js if we use more of it.
declare module 'sql.js' {
  export interface QueryExecResult { columns: string[]; values: unknown[][] }
  export interface Statement { step(): boolean; get(): unknown[]; getColumnNames(): string[]; free(): boolean }
  export interface Database { exec(sql: string): QueryExecResult[]; run(sql: string): void; prepare(sql: string): Statement; close(): void }
  export interface SqlJsStatic { Database: new () => Database }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>
}
