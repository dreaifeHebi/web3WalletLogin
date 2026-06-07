export {};

declare global {
  interface D1Result {
    success: boolean;
    meta: Record<string, unknown>;
    error?: string;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(): Promise<T | null>;
    run(): Promise<D1Result>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = D1Result>(statements: D1PreparedStatement[]): Promise<T[]>;
  }

  interface CloudflareEnv {
    DB: D1Database;
  }
}
