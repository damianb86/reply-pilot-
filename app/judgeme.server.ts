import db from "./db.server";
import {
  decryptSecret as decryptReviewProviderSecret,
  encryptSecret as encryptReviewProviderSecret,
  maskSecret,
} from "./secret.server";

const JUDGEME_API_BASE = process.env.JUDGEME_API_BASE_URL || "https://judge.me/api/v1";
const DEFAULT_JUDGEME_TIMEOUT_MS = 10000;

type JsonObject = Record<string, unknown>;

export class JudgeMeApiError extends Error {
  status?: number;
  statusText?: string;
  details?: unknown;

  constructor(message: string, options: { status?: number; statusText?: string; details?: unknown } = {}) {
    super(message);
    this.name = "JudgeMeApiError";
    this.status = options.status;
    this.statusText = options.statusText;
    this.details = options.details;
  }
}

export function encryptSecret(secret: string) {
  return encryptReviewProviderSecret(secret);
}

export function decryptSecret(value: string) {
  return decryptReviewProviderSecret(value);
}

export function maskJudgeMeToken(token: string) {
  return maskSecret(token);
}

function safeJsonParse(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function compactJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function readObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readStringList(value: unknown) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const object = item as JsonObject;
        return readString(object.message) || readString(object.error) || readString(object.detail);
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return null;
}

function readCount(value: unknown) {
  const data = readObject(value);
  const candidates = [
    data.count,
    data.reviews_count,
    data.total,
    data.total_count,
    data.review_count,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string" && candidate.trim() && !Number.isNaN(Number(candidate))) {
      return Number(candidate);
    }
  }

  return null;
}

function normalizeShopDomain(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function judgeMeTimeoutMs() {
  const value = Number(process.env.JUDGEME_API_TIMEOUT_MS || DEFAULT_JUDGEME_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_JUDGEME_TIMEOUT_MS;
}

function judgeMeResponseMessage(body: unknown) {
  if (typeof body === "string" && body.trim()) return body.trim();

  const data = readObject(body);
  const directMessage =
    readString(data.error) ||
    readString(data.message) ||
    readString(data.detail) ||
    readString(data.description);
  if (directMessage) return directMessage;

  const nestedError = readObject(data.error);
  const nestedMessage =
    readString(nestedError.message) ||
    readString(nestedError.error) ||
    readString(nestedError.detail);
  if (nestedMessage) return nestedMessage;

  const listMessage = [
    ...readStringList(data.errors),
    ...readStringList(data.messages),
  ].join(" ");

  return listMessage || null;
}

async function parseJudgeMeResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function callJudgeMeApi(
  path: string,
  options: {
    apiToken: string;
    shopDomain: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    searchParams?: Record<string, string | string[] | number | boolean | undefined>;
  },
) {
  const timeoutMs = judgeMeTimeoutMs();
  const url = new URL(`${JUDGEME_API_BASE}${path}`);
  url.searchParams.set("shop_domain", normalizeShopDomain(options.shopDomain));
  url.searchParams.set("api_token", options.apiToken);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        "X-Api-Token": options.apiToken,
      },
      signal: AbortSignal.timeout(timeoutMs),
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === "TimeoutError";
    const message = isTimeout
      ? `Judge.me did not respond within ${Math.round(timeoutMs / 1000)} seconds. Please try again later.`
      : error instanceof Error
        ? error.message
        : "Could not reach Judge.me.";

    throw new JudgeMeApiError(message, {
      details: {
        endpoint: path,
        shopDomain: normalizeShopDomain(options.shopDomain),
        timeoutMs,
      },
    });
  }

  const body = await parseJudgeMeResponse(response);

  if (!response.ok) {
    const message =
      judgeMeResponseMessage(body) ||
      `Judge.me request failed with ${response.status} ${response.statusText}`;

    throw new JudgeMeApiError(message, {
      status: response.status,
      statusText: response.statusText,
      details: {
        endpoint: path,
        shopDomain: normalizeShopDomain(options.shopDomain),
        response: body,
      },
    });
  }

  return body;
}

async function optionalJudgeMeApi(
  path: string,
  options: Parameters<typeof callJudgeMeApi>[1],
) {
  try {
    return {
      ok: true as const,
      body: await callJudgeMeApi(path, options),
    };
  } catch (error) {
    const serialized = serializeJudgeMeError(error);
    return {
      ok: false as const,
      error: {
        endpoint: path,
        message: serialized.message,
        status: serialized.status,
        statusText: serialized.statusText,
      },
    };
  }
}

export async function buildJudgeMeSnapshot(apiToken: string, shopDomain: string) {
  const normalizedShopDomain = normalizeShopDomain(shopDomain);
  const accountResponse = await callJudgeMeApi("/shops/info", {
    apiToken,
    shopDomain: normalizedShopDomain,
  });
  const [countResult, reviewsResult, settingsResult] = await Promise.all([
    optionalJudgeMeApi("/reviews/count", { apiToken, shopDomain: normalizedShopDomain }),
    optionalJudgeMeApi("/reviews", {
      apiToken,
      shopDomain: normalizedShopDomain,
      searchParams: { per_page: 5, page: 1 },
    }),
    optionalJudgeMeApi("/settings", {
      apiToken,
      shopDomain: normalizedShopDomain,
      searchParams: {
        "setting_keys[]": [
          "admin_email",
          "autopublish",
          "widget_star_color",
          "enable_review_pictures",
        ],
      },
    }),
  ]);
  const countResponse = countResult.ok ? countResult.body : null;
  const reviewsResponse = reviewsResult.ok ? reviewsResult.body : null;
  const settingsResponse = settingsResult.ok ? settingsResult.body : null;
  const optionalErrors = [countResult, reviewsResult, settingsResult]
    .filter((result) => !result.ok)
    .map((result) => result.error);

  const account = readObject(readObject(accountResponse).shop ?? accountResponse);
  const reviews = Array.isArray(readObject(reviewsResponse).reviews)
    ? (readObject(reviewsResponse).reviews as unknown[])
    : [];
  const settings = readObject(readObject(settingsResponse).settings ?? settingsResponse);

  return {
    shopDomain: normalizedShopDomain,
    account,
    settings,
    reviewCount: readCount(countResponse),
    sampleReviews: reviews.slice(0, 5),
    raw: {
      account: accountResponse,
      reviewCount: countResponse,
      reviews: reviewsResponse,
      settings: settingsResponse,
      optionalErrors,
    },
  };
}

export async function upsertJudgeMeConnection(input: {
  shop: string;
  shopDomain: string;
  apiToken: string;
  authMethod: "private_token";
  scope?: string | null;
}) {
  const snapshot = await buildJudgeMeSnapshot(input.apiToken, input.shopDomain);
  const account = snapshot.account;

  return db.judgeMeConnection.upsert({
    where: { shop: input.shop },
    update: {
      shopDomain: snapshot.shopDomain,
      authMethod: input.authMethod,
      encryptedApiToken: encryptSecret(input.apiToken),
      tokenMask: maskJudgeMeToken(input.apiToken),
      scope: input.scope ?? null,
      status: "connected",
      shopName: readString(account.name),
      shopEmail: readString(account.email),
      ownerName: readString(account.owner),
      plan: readString(account.plan),
      platform: readString(account.platform),
      country: readString(account.country),
      timezone: readString(account.timezone),
      widgetVersion: readString(account.widget_version),
      awesome: readBoolean(account.awesome),
      reviewCount: snapshot.reviewCount,
      lastVerifiedAt: new Date(),
      lastError: null,
      accountJson: compactJson(snapshot.raw.account),
      settingsJson: compactJson(snapshot.settings),
      sampleReviewsJson: compactJson(snapshot.sampleReviews),
    },
    create: {
      shop: input.shop,
      shopDomain: snapshot.shopDomain,
      authMethod: input.authMethod,
      encryptedApiToken: encryptSecret(input.apiToken),
      tokenMask: maskJudgeMeToken(input.apiToken),
      scope: input.scope ?? null,
      status: "connected",
      shopName: readString(account.name),
      shopEmail: readString(account.email),
      ownerName: readString(account.owner),
      plan: readString(account.plan),
      platform: readString(account.platform),
      country: readString(account.country),
      timezone: readString(account.timezone),
      widgetVersion: readString(account.widget_version),
      awesome: readBoolean(account.awesome),
      reviewCount: snapshot.reviewCount,
      lastVerifiedAt: new Date(),
      lastError: null,
      accountJson: compactJson(snapshot.raw.account),
      settingsJson: compactJson(snapshot.settings),
      sampleReviewsJson: compactJson(snapshot.sampleReviews),
    },
  });
}

export async function refreshJudgeMeConnection(shop: string) {
  const connection = await db.judgeMeConnection.findUnique({ where: { shop } });
  if (!connection) {
    throw new JudgeMeApiError("There is no Judge.me connection saved for this shop.");
  }

  try {
    const apiToken = decryptSecret(connection.encryptedApiToken);
    const snapshot = await buildJudgeMeSnapshot(apiToken, connection.shopDomain);
    const account = snapshot.account;

    return db.judgeMeConnection.update({
      where: { shop },
      data: {
        status: "connected",
        shopName: readString(account.name),
        shopEmail: readString(account.email),
        ownerName: readString(account.owner),
        plan: readString(account.plan),
        platform: readString(account.platform),
        country: readString(account.country),
        timezone: readString(account.timezone),
        widgetVersion: readString(account.widget_version),
        awesome: readBoolean(account.awesome),
        reviewCount: snapshot.reviewCount,
        lastVerifiedAt: new Date(),
        lastError: null,
        accountJson: compactJson(snapshot.raw.account),
        settingsJson: compactJson(snapshot.settings),
        sampleReviewsJson: compactJson(snapshot.sampleReviews),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Judge.me error";
    await db.judgeMeConnection.update({
      where: { shop },
      data: {
        status: "error",
        lastError: message,
      },
    });
    throw error;
  }
}

export async function getJudgeMeConnectionView(shop: string) {
  const connection = await db.judgeMeConnection.findUnique({ where: { shop } });
  if (!connection) return null;

  return {
    id: connection.id,
    shop: connection.shop,
    shopDomain: connection.shopDomain,
    authMethod: connection.authMethod,
    tokenMask: connection.tokenMask,
    scope: connection.scope,
    status: connection.status,
    shopName: connection.shopName,
    shopEmail: connection.shopEmail,
    ownerName: connection.ownerName,
    plan: connection.plan,
    platform: connection.platform,
    country: connection.country,
    timezone: connection.timezone,
    widgetVersion: connection.widgetVersion,
    awesome: connection.awesome,
    reviewCount: connection.reviewCount,
    lastVerifiedAt: connection.lastVerifiedAt?.toISOString() ?? null,
    lastError: connection.lastError,
    account: safeJsonParse(connection.accountJson),
    settings: safeJsonParse(connection.settingsJson),
    sampleReviews: safeJsonParse(connection.sampleReviewsJson),
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

export async function disconnectJudgeMe(shop: string) {
  await db.judgeMeConnection.deleteMany({ where: { shop } });
}

export function serializeJudgeMeError(error: unknown) {
  if (error instanceof JudgeMeApiError) {
    return {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.stack,
    };
  }

  return {
    message: "Unknown Judge.me connection error.",
    details: error,
  };
}
