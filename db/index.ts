import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type LegalOfficeRuntime = typeof globalThis & {
  __LEGAL_OFFICE_D1__?: D1Database;
};

export function getDb() {
  return drizzle(getD1(), { schema });
}

export function getD1() {
  const database = (globalThis as LegalOfficeRuntime).__LEGAL_OFFICE_D1__;
  if (!database) {
    throw new Error("قاعدة البيانات القانونية غير متاحة حالياً.");
  }

  return database;
}
