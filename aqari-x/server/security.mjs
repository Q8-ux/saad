import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const uid = () => randomBytes(16).toString("hex");
export const hash = (value) =>
  createHash("sha256").update(String(value)).digest("hex");
export const safeEqual = (a, b) => {
  const aa = Buffer.from(String(a)),
    bb = Buffer.from(String(b));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt}:${derived.toString("hex")}`;
}
export async function passwordValid(password, stored) {
  if (!stored?.includes(":")) return false;
  const [salt, expected] = stored.split(":");
  return safeEqual(
    (await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 })).toString(
      "hex",
    ),
    expected,
  );
}
export function seal(data, key) {
  if (!key) throw new Error("VAULT_KEY required");
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(hash(key), "hex"),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function unseal(data, key) {
  const [iv, tag, bytes] = data.split(".").map((x) => Buffer.from(x, "base64"));
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(hash(key), "hex"),
    iv,
  );
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(bytes), cipher.final()]).toString("utf8"),
  );
}
export function validatePassword(s) {
  if (typeof s !== "string" || s.length < 10 || s.length > 128)
    throw Object.assign(new Error("كلمة المرور بين 10 و128 حرفاً"), {
      status: 400,
    });
}
export function validPhone(s) {
  return /^\+?[0-9]{8,15}$/.test(String(s).replace(/\s/g, ""));
}
export function isRaster(buffer, mime) {
  return mime === "image/jpeg"
    ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
    : mime === "image/png"
      ? buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/webp"
        ? buffer.toString("ascii", 0, 4) === "RIFF" &&
          buffer.toString("ascii", 8, 12) === "WEBP"
        : false;
}
