import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Cloudflare Sites injects a real D1 binding at runtime. Render does not, so
// the Render-only branch supplies a small D1-compatible adapter backed by
// better-sqlite3. This keeps the application routes unchanged while allowing
// the same SQL to run on a regular Node server.
type LegalOfficeRuntime = typeof globalThis & {
  __LEGAL_OFFICE_D1__?: D1Database;
  __LEGAL_OFFICE_NODE_D1__?: D1Database;
  __LEGAL_OFFICE_LOCAL_AUTH_BOOTSTRAP__?: string;
  __LEGAL_OFFICE_LOCAL_AUTH_PEPPER__?: string;
  __LEGAL_OFFICE_PLATFORM_ADMIN_EMAILS__?: string;
};

const runtimeDefaults = globalThis as LegalOfficeRuntime;
if (typeof process !== "undefined" && process.versions?.node) {
  // Render bootstrap: password is never stored in plaintext. These values are
  // a PBKDF2 salt/hash for the initial administrator requested by the owner.
  runtimeDefaults.__LEGAL_OFFICE_LOCAL_AUTH_PEPPER__ ??= "render-local-bootstrap-v1";
  runtimeDefaults.__LEGAL_OFFICE_LOCAL_AUTH_BOOTSTRAP__ ??= JSON.stringify([
    {
      id: "c27ff055-ec13-43c8-b43e-72d6f0f26078",
      username: "Saad",
      email: "saad@legal.local",
      displayName: "Saad",
      isPlatformAdmin: true,
      initialOfficeName: "منصة العقود والترجمة القانونية",
      passwordSalt: "lRsZOJEWDs38zGsRfFUD9Q",
      passwordHash: "YhOr8njLaH9JCxpOCem0CixziczSANPbiTUL7O7J2E4",
      passwordIterations: 100000,
    },
  ]);
  runtimeDefaults.__LEGAL_OFFICE_PLATFORM_ADMIN_EMAILS__ ??= "saad@legal.local";
}

type RunMeta = {
  changes: number;
  last_row_id?: number;
};

type D1LikeResult<T = Record<string, unknown>> = {
  success: boolean;
  results?: T[];
  meta: RunMeta;
};

type BetterSqliteStatement = {
  reader: boolean;
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  all: (...params: unknown[]) => Record<string, unknown>[];
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
};

type BetterSqliteDatabase = {
  pragma: (sql: string) => unknown;
  exec: (sql: string) => void;
  prepare: (sql: string) => BetterSqliteStatement;
  transaction: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

class NodePreparedStatement {
  private params: unknown[] = [];

  constructor(
    private readonly database: BetterSqliteDatabase,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    const statement = new NodePreparedStatement(this.database, this.sql);
    statement.params = values;
    return statement;
  }

  run(): D1LikeResult {
    const info = this.database.prepare(this.sql).run(...this.params);
    const last = typeof info.lastInsertRowid === "bigint"
      ? Number(info.lastInsertRowid)
      : info.lastInsertRowid;
    return {
      success: true,
      meta: {
        changes: info.changes,
        ...(Number.isSafeInteger(last) ? { last_row_id: last } : {}),
      },
    };
  }

  all<T = Record<string, unknown>>(): D1LikeResult<T> {
    const statement = this.database.prepare(this.sql);
    if (!statement.reader) {
      return this.run() as D1LikeResult<T>;
    }
    return {
      success: true,
      results: statement.all(...this.params) as T[],
      meta: { changes: 0 },
    };
  }

  first<T = Record<string, unknown>>(): T | null {
    const statement = this.database.prepare(this.sql);
    if (!statement.reader) return null;
    return (statement.get(...this.params) as T | undefined) ?? null;
  }
}

class NodeD1Database {
  constructor(private readonly database: BetterSqliteDatabase) {}

  prepare(sql: string) {
    return new NodePreparedStatement(this.database, sql);
  }

  batch(statements: NodePreparedStatement[]) {
    const execute = this.database.transaction((items: NodePreparedStatement[]) =>
      items.map((item) => {
        const statement = this.database.prepare(item.sql);
        return statement.reader ? item.all() : item.run();
      }),
    );
    return execute(statements);
  }

  exec(sql: string) {
    this.database.exec(sql);
    return { count: 1, duration: 0 };
  }
}

function loadNodeD1(): D1Database {
  const runtime = globalThis as LegalOfficeRuntime;
  if (runtime.__LEGAL_OFFICE_NODE_D1__) return runtime.__LEGAL_OFFICE_NODE_D1__;

  // Hide the Node-only dependency from Cloudflare/Vite static analysis. This
  // code path is reached only when a D1 binding is absent (Render Node server).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const require = Function("return require")() as (id: string) => unknown;
  const BetterSqlite3 = require("better-sqlite3") as new (path: string) => BetterSqliteDatabase;
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");

  const dataDir = process.env.RENDER_DISK_PATH || path.resolve(process.cwd(), ".render-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const databasePath = path.join(dataDir, "legal-office.sqlite");
  const database = new BetterSqlite3(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  // Apply generated SQLite migrations exactly once per database file.
  database.exec(
    "CREATE TABLE IF NOT EXISTS __render_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  const migrationDir = path.resolve(process.cwd(), "drizzle");
  if (fs.existsSync(migrationDir)) {
    const files = fs
      .readdirSync(migrationDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const name of files) {
      const applied = database
        .prepare("SELECT name FROM __render_migrations WHERE name=? LIMIT 1")
        .get(name);
      if (applied) continue;
      const sql = fs.readFileSync(path.join(migrationDir, name), "utf8");
      const apply = database.transaction(() => {
        database.exec(sql);
        database.prepare("INSERT INTO __render_migrations (name) VALUES (?)").run(name);
      });
      apply();
    }
  }

  const adapter = new NodeD1Database(database) as unknown as D1Database;
  runtime.__LEGAL_OFFICE_NODE_D1__ = adapter;
  return adapter;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export function getD1() {
  const runtime = globalThis as LegalOfficeRuntime;
  if (runtime.__LEGAL_OFFICE_D1__) return runtime.__LEGAL_OFFICE_D1__;

  if (typeof process !== "undefined" && process.versions?.node) {
    return loadNodeD1();
  }

  throw new Error("قاعدة البيانات القانونية غير متاحة حالياً.");
}
