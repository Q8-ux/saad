import { RequestValidationError } from "./request-security.ts";

export type OfficeResource =
  | "clients"
  | "cases"
  | "hearings"
  | "invoices"
  | "memos"
  | "settings";

export const CASE_STATUSES = new Set(["active", "pending", "urgent", "closed"]);
export const HEARING_KINDS = new Set(["hearing", "task"]);
export const HEARING_STATUSES = new Set(["pending", "done"]);
export const INVOICE_STATUSES = new Set(["paid", "unpaid", "overdue"]);
export const OFFICE_CURRENCIES = new Set(["KWD", "USD", "SAR"]);

const DATE_PATTERN = /^\d{4}-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isOfficeResource(value: unknown): value is OfficeResource {
  return (
    value === "clients" ||
    value === "cases" ||
    value === "hearings" ||
    value === "invoices" ||
    value === "memos" ||
    value === "settings"
  );
}

export function textValue(value: unknown, max = 5000): string {
  return String(value ?? "").trim().slice(0, max);
}

export function requiredText(value: unknown, label: string, max = 5000): string {
  const text = textValue(value, max);
  if (!text) throw new RequestValidationError(`${label} مطلوب.`);
  return text;
}

export function nullableId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function requiredId(value: unknown, label: string): number {
  const id = nullableId(value);
  if (!id) throw new RequestValidationError(`${label} غير صحيح.`);
  return id;
}

export function validEmail(value: unknown): string {
  const email = textValue(value, 180);
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new RequestValidationError("البريد الإلكتروني غير صحيح.");
  }
  return email;
}

export function dateValue(
  value: unknown,
  label: string,
  { required = false }: { required?: boolean } = {},
): string {
  const date = String(value ?? "").trim();
  if (!date) {
    if (required) throw new RequestValidationError(`${label} مطلوب.`);
    return "";
  }

  const match = date.match(DATE_PATTERN);
  if (!match) throw new RequestValidationError(`${label} غير صحيح.`);

  const year = Number(date.slice(0, 4));
  const month = Number(match[1]);
  const day = Number(match[2]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RequestValidationError(`${label} غير صحيح.`);
  }
  return date;
}

export function timeValue(value: unknown): string {
  const time = String(value ?? "").trim();
  if (!time) return "";
  if (!TIME_PATTERN.test(time)) {
    throw new RequestValidationError("الوقت غير صحيح.");
  }
  return time;
}

export function allowedValue(
  value: unknown,
  allowed: Set<string>,
  fallback: string,
  label: string,
): string {
  const selected = textValue(value, 30) || fallback;
  if (!allowed.has(selected)) {
    throw new RequestValidationError(`${label} غير صحيح.`);
  }
  return selected;
}

export function amountFils(value: unknown): number {
  const amount = Math.round(Number(value));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 9_999_999_999_999) {
    throw new RequestValidationError("قيمة الفاتورة غير صحيحة.");
  }
  return amount;
}

export function didWrite(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const meta = (result as { meta?: { changes?: number } }).meta;
  return Number(meta?.changes ?? 0) > 0;
}
