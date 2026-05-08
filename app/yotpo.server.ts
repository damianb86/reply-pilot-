import db from "./db.server";
import { decryptSecret, encryptSecret, maskSecret } from "./secret.server";

const YOTPO_CORE_API_BASE = process.env.YOTPO_CORE_API_BASE_URL || "https://api.yotpo.com";
const YOTPO_DEVELOPER_API_BASE = process.env.YOTPO_DEVELOPER_API_BASE_URL || "https://developers.yotpo.com/v2";
const DEFAULT_YOTPO_TIMEOUT_MS = 10000;

type JsonObject = Record<string, unknown>;

export type YotpoCredentials = {
  storeId: string;
  apiSecret: string;
  developerAccessToken: string | null;
};

export class YotpoApiError extends Error {
  status?: number;
  statusText?: string;
  details?: unknown;

  constructor(message: string, options: { status?: number; statusText?: string; details?: unknown } = {}) {
    super(message);
    this.name = "YotpoApiError";
    this.status = options.status;
    this.statusText = options.statusText;
    this.details = options.details;
  }
}

function yotpoTimeoutMs() {
  const value = Number(process.env.YOTPO_API_TIMEOUT_MS || DEFAULT_YOTPO_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_YOTPO_TIMEOUT_MS;
}

function compactJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function safeJsonParse(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function readObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
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

function responseMessage(body: unknown) {
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

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function requestYotpo(
  url: URL,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    headers?: Record<string, string | undefined>;
    endpoint: string;
  },
) {
  const timeoutMs = yotpoTimeoutMs();
  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...Object.fromEntries(Object.entries(options.headers ?? {}).filter(([, value]) => Boolean(value))),
      },
      signal: AbortSignal.timeout(timeoutMs),
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === "TimeoutError";
    const message = isTimeout
      ? `Yotpo did not respond within ${Math.round(timeoutMs / 1000)} seconds. Please try again later.`
      : error instanceof Error
        ? error.message
        : "Could not reach Yotpo.";

    throw new YotpoApiError(message, {
      details: {
        endpoint: options.endpoint,
        timeoutMs,
      },
    });
  }

  const body = await parseResponse(response);

  if (!response.ok) {
    const message =
      responseMessage(body) ||
      `Yotpo request failed with ${response.status} ${response.statusText}`;

    throw new YotpoApiError(message, {
      status: response.status,
      statusText: response.statusText,
      details: {
        endpoint: options.endpoint,
        response: body,
      },
    });
  }

  return body;
}

export async function callYotpoCoreApi(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    searchParams?: Record<string, string | number | boolean | undefined>;
    accessToken?: string | null;
    headers?: Record<string, string | undefined>;
  } = {},
) {
  const url = new URL(`${YOTPO_CORE_API_BASE}${path}`);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return requestYotpo(url, {
    endpoint: path,
    method: options.method,
    body: options.body,
    headers: {
      ...(options.accessToken ? { "X-Yotpo-Token": options.accessToken } : {}),
      ...options.headers,
    },
  });
}

export async function callYotpoDeveloperApi(
  path: string,
  options: {
    accessToken: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    searchParams?: Record<string, string | number | boolean | undefined>;
  },
) {
  const url = new URL(`${YOTPO_DEVELOPER_API_BASE}${path}`);
  url.searchParams.set("access_token", options.accessToken);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return requestYotpo(url, {
    endpoint: path,
    method: options.method,
    body: options.body,
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
    },
  });
}

function tokenFromResponse(body: unknown) {
  const data = readObject(body);
  const response = readObject(data.response);
  const nestedData = readObject(data.data);
  const candidates = [
    data.access_token,
    data.token,
    data.utoken,
    response.access_token,
    response.token,
    response.utoken,
    nestedData.access_token,
    nestedData.token,
    nestedData.utoken,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  return "";
}

export async function generateYotpoCoreAccessToken(storeId: string, apiSecret: string) {
  try {
    const body = await callYotpoCoreApi(`/core/v3/stores/${encodeURIComponent(storeId)}/access_tokens`, {
      method: "POST",
      body: { secret: apiSecret },
    });
    const token = tokenFromResponse(body);
    if (token) return token;
  } catch (error) {
    if (error instanceof YotpoApiError && error.status && error.status !== 404) {
      throw error;
    }
  }

  const legacyBody = await callYotpoCoreApi("/oauth/token", {
    method: "POST",
    body: {
      client_id: storeId,
      client_secret: apiSecret,
      grant_type: "client_credentials",
    },
  });
  const token = tokenFromResponse(legacyBody);
  if (!token) {
    throw new YotpoApiError("Yotpo did not return an access token.", {
      details: { endpoint: "/oauth/token" },
    });
  }
  return token;
}

function reviewsFromResponse(body: unknown) {
  const data = readObject(body);
  const response = readObject(data.response);
  const nestedData = readObject(data.data);
  const candidates = [
    data.reviews,
    data.items,
    data.results,
    response.reviews,
    response.items,
    response.results,
    nestedData.reviews,
    nestedData.items,
    nestedData.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function countFromResponse(body: unknown, fallback: number) {
  const data = readObject(body);
  const response = readObject(data.response);
  const pagination = readObject(response.pagination) || readObject(data.pagination);
  const bottomline = readObject(response.bottomline) || readObject(data.bottomline);
  const candidates = [
    data.total,
    data.count,
    data.total_reviews,
    data.review_count,
    data.reviews_count,
    response.total,
    response.count,
    response.total_reviews,
    response.review_count,
    response.reviews_count,
    pagination.total,
    bottomline.total_review,
    bottomline.total_reviews,
  ];

  for (const candidate of candidates) {
    const count = readNumber(candidate);
    if (count !== null) return count;
  }

  return fallback;
}

async function optionalYotpoApi(
  path: string,
  call: () => Promise<unknown>,
) {
  try {
    return {
      ok: true as const,
      body: await call(),
    };
  } catch (error) {
    const serialized = serializeYotpoError(error);
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

export async function fetchYotpoReviews(credentials: YotpoCredentials) {
  if (credentials.developerAccessToken) {
    const response = await callYotpoDeveloperApi(`/${encodeURIComponent(credentials.storeId)}/reviews`, {
      accessToken: credentials.developerAccessToken,
      searchParams: {
        count: 50,
        page: 1,
        include_nested: true,
        include_site_reviews: true,
        direction: "desc",
      },
    });
    const reviews = reviewsFromResponse(response);
    return {
      response,
      reviews,
      reviewCount: countFromResponse(response, reviews.length),
      source: "developer_api",
    };
  }

  const accessToken = await generateYotpoCoreAccessToken(credentials.storeId, credentials.apiSecret);
  const response = await callYotpoCoreApi(`/v1/apps/${encodeURIComponent(credentials.storeId)}/reviews`, {
    accessToken,
    searchParams: { count: 50, page: 1 },
  });
  const reviews = reviewsFromResponse(response);
  return {
    response,
    reviews,
    reviewCount: countFromResponse(response, reviews.length),
    source: "ugc_api",
  };
}

export async function buildYotpoSnapshot(input: {
  storeId: string;
  apiSecret: string;
  developerAccessToken?: string | null;
}) {
  const storeId = input.storeId.trim();
  const developerAccessToken = input.developerAccessToken?.trim() || null;
  const coreAccessToken = await generateYotpoCoreAccessToken(storeId, input.apiSecret);
  const reviewsResult = await optionalYotpoApi(
    developerAccessToken ? "/reviews" : "/v1/apps/{store_id}/reviews",
    () => (
      developerAccessToken
        ? callYotpoDeveloperApi(`/${encodeURIComponent(storeId)}/reviews`, {
            accessToken: developerAccessToken,
            searchParams: {
              count: 5,
              page: 1,
              include_nested: true,
              include_site_reviews: true,
              direction: "desc",
            },
          })
        : callYotpoCoreApi(`/v1/apps/${encodeURIComponent(storeId)}/reviews`, {
            accessToken: coreAccessToken,
            searchParams: { count: 5, page: 1 },
          })
    ),
  );

  const reviewsResponse = reviewsResult.ok ? reviewsResult.body : null;
  const sampleReviews = reviewsFromResponse(reviewsResponse).slice(0, 5);
  const reviewCount = countFromResponse(reviewsResponse, sampleReviews.length);

  return {
    storeId,
    account: {
      storeId,
      appKey: storeId,
      hasDeveloperAccessToken: Boolean(developerAccessToken),
      api: developerAccessToken ? "App Developer API + UGC API" : "UGC API",
    },
    settings: {
      reviewsEndpoint: developerAccessToken
        ? "https://developers.yotpo.com/v2/{account_id}/reviews"
        : "https://api.yotpo.com/v1/apps/{store_id}/reviews",
      commentsEndpoint: "https://developers.yotpo.com/v2/{account_id}/reviews/{review_id}/comment",
      supportsPublicComments: Boolean(developerAccessToken),
    },
    reviewCount,
    sampleReviews,
    raw: {
      accessTokenVerified: Boolean(coreAccessToken),
      reviews: reviewsResponse,
      optionalErrors: reviewsResult.ok ? [] : [reviewsResult.error],
    },
  };
}

function encryptedCredentials(input: YotpoCredentials) {
  return encryptSecret(JSON.stringify(input));
}

function credentialMasks(input: YotpoCredentials) {
  return JSON.stringify({
    storeId: input.storeId,
    apiSecret: maskSecret(input.apiSecret),
    developerAccessToken: input.developerAccessToken ? maskSecret(input.developerAccessToken) : null,
  });
}

function decryptCredentials(value: string): YotpoCredentials {
  const decrypted = decryptSecret(value);
  const parsed = safeJsonParse(decrypted);
  const data = readObject(parsed);

  return {
    storeId: readString(data.storeId) || "",
    apiSecret: readString(data.apiSecret) || "",
    developerAccessToken: readString(data.developerAccessToken),
  };
}

export async function upsertYotpoConnection(input: {
  shop: string;
  storeId: string;
  apiSecret: string;
  developerAccessToken?: string | null;
}) {
  const credentials: YotpoCredentials = {
    storeId: input.storeId.trim(),
    apiSecret: input.apiSecret.trim(),
    developerAccessToken: input.developerAccessToken?.trim() || null,
  };
  const snapshot = await buildYotpoSnapshot(credentials);

  return db.reviewProviderConnection.upsert({
    where: {
      shop_provider: {
        shop: input.shop,
        provider: "yotpo",
      },
    },
    update: {
      providerAccountId: credentials.storeId,
      providerShopDomain: null,
      authMethod: credentials.developerAccessToken ? "app_key_secret_developer_token" : "app_key_secret",
      encryptedCredentialsJson: encryptedCredentials(credentials),
      credentialMaskJson: credentialMasks(credentials),
      scope: credentials.developerAccessToken ? "reviews:read reviews:comment" : "reviews:read",
      status: "connected",
      displayName: "Yotpo",
      reviewCount: snapshot.reviewCount,
      lastVerifiedAt: new Date(),
      lastError: null,
      accountJson: compactJson(snapshot.account),
      settingsJson: compactJson(snapshot.settings),
      sampleReviewsJson: compactJson(snapshot.sampleReviews),
    },
    create: {
      shop: input.shop,
      provider: "yotpo",
      providerAccountId: credentials.storeId,
      providerShopDomain: null,
      authMethod: credentials.developerAccessToken ? "app_key_secret_developer_token" : "app_key_secret",
      encryptedCredentialsJson: encryptedCredentials(credentials),
      credentialMaskJson: credentialMasks(credentials),
      scope: credentials.developerAccessToken ? "reviews:read reviews:comment" : "reviews:read",
      status: "connected",
      displayName: "Yotpo",
      reviewCount: snapshot.reviewCount,
      lastVerifiedAt: new Date(),
      lastError: null,
      accountJson: compactJson(snapshot.account),
      settingsJson: compactJson(snapshot.settings),
      sampleReviewsJson: compactJson(snapshot.sampleReviews),
    },
  });
}

export async function refreshYotpoConnection(shop: string) {
  const connection = await db.reviewProviderConnection.findUnique({
    where: { shop_provider: { shop, provider: "yotpo" } },
  });
  if (!connection) {
    throw new YotpoApiError("There is no Yotpo connection saved for this shop.");
  }

  try {
    const credentials = decryptCredentials(connection.encryptedCredentialsJson);
    const snapshot = await buildYotpoSnapshot(credentials);

    return db.reviewProviderConnection.update({
      where: { id: connection.id },
      data: {
        status: "connected",
        reviewCount: snapshot.reviewCount,
        lastVerifiedAt: new Date(),
        lastError: null,
        accountJson: compactJson(snapshot.account),
        settingsJson: compactJson(snapshot.settings),
        sampleReviewsJson: compactJson(snapshot.sampleReviews),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Yotpo error";
    await db.reviewProviderConnection.update({
      where: { id: connection.id },
      data: {
        status: "error",
        lastError: message,
      },
    });
    throw error;
  }
}

export async function getConnectedYotpoCredentials(shop: string) {
  const connection = await db.reviewProviderConnection.findUnique({
    where: { shop_provider: { shop, provider: "yotpo" } },
  });
  if (!connection || connection.status !== "connected") return null;

  const credentials = decryptCredentials(connection.encryptedCredentialsJson);
  if (!credentials.storeId || !credentials.apiSecret) return null;
  return credentials;
}

export async function getYotpoConnectionView(shop: string) {
  const connection = await db.reviewProviderConnection.findUnique({
    where: { shop_provider: { shop, provider: "yotpo" } },
  });
  if (!connection) return null;

  const masks = readObject(safeJsonParse(connection.credentialMaskJson));

  return {
    id: connection.id,
    shop: connection.shop,
    provider: "yotpo",
    providerName: "Yotpo",
    providerLogo: "/provider-logos/yotpo.svg",
    providerAccountId: connection.providerAccountId,
    shopDomain: connection.providerShopDomain,
    authMethod: connection.authMethod,
    tokenMask: readString(masks.developerAccessToken) || readString(masks.apiSecret) || "••••",
    credentialMasks: masks,
    scope: connection.scope,
    status: connection.status,
    shopName: connection.displayName,
    shopEmail: null,
    ownerName: null,
    plan: null,
    platform: null,
    country: null,
    timezone: null,
    widgetVersion: null,
    awesome: readBoolean(readObject(safeJsonParse(connection.accountJson)).awesome),
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

export async function disconnectYotpo(shop: string) {
  await db.reviewProviderConnection.deleteMany({
    where: { shop, provider: "yotpo" },
  });
}

export async function sendYotpoReviewComment(input: {
  credentials: YotpoCredentials;
  reviewId: string;
  content: string;
  isPublic?: boolean;
}) {
  if (!input.credentials.developerAccessToken) {
    throw new YotpoApiError(
      "Yotpo App Developer API access token is required to comment on reviews.",
      { details: { endpoint: "/{account_id}/reviews/{review_id}/comment" } },
    );
  }

  return callYotpoDeveloperApi(
    `/${encodeURIComponent(input.credentials.storeId)}/reviews/${encodeURIComponent(input.reviewId)}/comment`,
    {
      accessToken: input.credentials.developerAccessToken,
      method: "POST",
      body: {
        content: input.content,
        public: input.isPublic !== false,
      },
    },
  );
}

export function yotpoAlreadyCommentedMessage(error: unknown) {
  const text = [
    error instanceof Error ? error.message : "",
    error instanceof YotpoApiError ? JSON.stringify(error.details ?? "") : "",
  ].join(" ").toLowerCase();

  return (
    text.includes("already") ||
    text.includes("maximum of one comment") ||
    (text.includes("comment") && text.includes("exist"))
  );
}

export function serializeYotpoError(error: unknown) {
  if (error instanceof YotpoApiError) {
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
    message: "Unknown Yotpo connection error.",
    details: error,
  };
}
