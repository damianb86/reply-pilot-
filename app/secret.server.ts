import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const TOKEN_PREFIX = "v1";

function base64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function encryptionKey() {
  const seed =
    process.env.REVIEW_PROVIDER_TOKEN_ENCRYPTION_KEY ||
    process.env.JUDGEME_TOKEN_ENCRYPTION_KEY ||
    process.env.SHOPIFY_API_SECRET ||
    process.env.SHOPIFY_API_KEY ||
    "reply-pilot-local-development-key";

  return createHash("sha256").update(seed).digest();
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [TOKEN_PREFIX, base64Url(iv), base64Url(tag), base64Url(encrypted)].join(":");
}

export function decryptSecret(value: string) {
  const [prefix, ivValue, tagValue, encryptedValue] = value.split(":");
  if (prefix !== TOKEN_PREFIX || !ivValue || !tagValue || !encryptedValue) {
    return value;
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), fromBase64Url(ivValue));
  decipher.setAuthTag(fromBase64Url(tagValue));

  return Buffer.concat([
    decipher.update(fromBase64Url(encryptedValue)),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(secret: string) {
  if (secret.length <= 10) return "••••";
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}
