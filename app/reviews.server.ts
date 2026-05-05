import db from "./db.server";
import {
  generateReviewReplyText,
  getAiModelOptions,
  getDefaultAiModelId,
} from "./ai.server";
import { callJudgeMeApi, decryptSecret, JudgeMeApiError } from "./judgeme.server";
import {
  findProductByTitle,
  loadShopifyProducts,
  type ShopifyProductSummary,
} from "./shopify-products.server";

type AdminGraphql = Parameters<typeof loadShopifyProducts>[0];

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function compactJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function readStringListJson(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function compactTags(tags?: string[] | null) {
  const cleanTags = tags?.map((tag) => tag.trim()).filter(Boolean).slice(0, 20) ?? [];
  return cleanTags.length ? JSON.stringify(cleanTags) : null;
}

function compactError(error: unknown) {
  try {
    if (error instanceof Error) {
      return JSON.stringify({
        message: error.message,
        name: error.name,
        details: "details" in error ? (error as { details?: unknown }).details : undefined,
      }).slice(0, 8000);
    }

    return JSON.stringify({ message: "Unknown AI generation error.", details: error }).slice(0, 8000);
  } catch {
    if (error instanceof Error) {
      return JSON.stringify({ message: error.message, name: error.name }).slice(0, 8000);
    }
    return JSON.stringify({ message: "Unknown AI generation error." });
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown AI generation error.";
}

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "RP";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ageLabel(date?: Date | null) {
  if (!date) return "new";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function buildConfidence(reviewBody: string, rating: number) {
  const text = reviewBody.toLowerCase();
  const sensitive = ["refund", "never arrived", "broken", "angry", "disappointed", "nothing", "scam"];
  const penalty = sensitive.some((word) => text.includes(word)) ? 22 : 0;
  const base = rating >= 5 ? 94 : rating === 4 ? 88 : rating === 3 ? 76 : rating === 2 ? 62 : 42;
  const jitter = Math.floor(Math.random() * 6) - 2;
  return Math.max(28, Math.min(98, base + jitter - penalty));
}

function needsHuman(reviewBody: string, rating: number, confidence: number) {
  const text = reviewBody.toLowerCase();
  return (
    confidence < 75 ||
    rating <= 2 ||
    ["refund", "never arrived", "broken", "chargeback", "angry", "urgent"].some((word) =>
      text.includes(word),
    )
  );
}

function reviewFields(rawReview: unknown) {
  const review = readObject(rawReview);
  const reviewer = readObject(review.reviewer);
  const id = String(review.id ?? "");
  const customer =
    readString(reviewer.name) ||
    readString(review.name) ||
    readString(review.reviewer_name) ||
    readString(reviewer.email) ||
    "Customer";
  const body = readString(review.body) || readString(review.title) || "No review body provided.";
  const rating = Math.round(readNumber(review.rating, 0));
  const createdAt = readString(review.created_at) ? new Date(readString(review.created_at)) : new Date();

  return {
    id,
    customer,
    initials: initialsFromName(customer),
    productTitle: readString(review.product_title) || "Store review",
    reviewBody: body,
    rating,
    sourceCreatedAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
  };
}

async function getConnectedJudgeMeCredentials(shop: string) {
  const connection = await db.judgeMeConnection.findUnique({ where: { shop } });
  if (!connection || connection.status !== "connected") return null;

  return {
    shopDomain: connection.shopDomain,
    apiToken: decryptSecret(connection.encryptedApiToken),
  };
}

export async function syncJudgeMeReviews(shop: string, admin?: AdminGraphql) {
  const credentials = await getConnectedJudgeMeCredentials(shop);
  if (!credentials) return { connected: false, imported: 0 };
  const products = await loadShopifyProducts(admin).catch(() => [] as ShopifyProductSummary[]);

  const response = await callJudgeMeApi("/reviews", {
    apiToken: credentials.apiToken,
    shopDomain: credentials.shopDomain,
    searchParams: { per_page: 50, page: 1 },
  });
  const reviews = Array.isArray(readObject(response).reviews)
    ? (readObject(response).reviews as unknown[])
    : [];
  let imported = 0;

  for (const rawReview of reviews) {
    const fields = reviewFields(rawReview);
    if (!fields.id) continue;
    const product = findProductByTitle(products, fields.productTitle);
    const productType = product?.productType || null;
    const productTagsJson = compactTags(product?.tags);

    const existing = await db.reviewDraft.findUnique({
      where: {
        shop_source_sourceReviewId: {
          shop,
          source: "judgeme",
          sourceReviewId: fields.id,
        },
      },
    });

    if (existing) {
      await db.reviewDraft.update({
        where: { id: existing.id },
        data: {
          customerName: fields.customer,
          customerInitials: fields.initials,
          productTitle: fields.productTitle,
          productType,
          productTagsJson,
          reviewBody: fields.reviewBody,
          rating: fields.rating,
          sourceCreatedAt: fields.sourceCreatedAt,
          sourceReviewJson: compactJson(rawReview),
          lastSyncedAt: new Date(),
        },
      });
    } else {
      await db.reviewDraft.create({
        data: {
          shop,
          source: "judgeme",
          sourceReviewId: fields.id,
          customerName: fields.customer,
          customerInitials: fields.initials,
          productTitle: fields.productTitle,
          productType,
          productTagsJson,
          reviewBody: fields.reviewBody,
          rating: fields.rating,
          sourceCreatedAt: fields.sourceCreatedAt,
          sourceReviewJson: compactJson(rawReview),
          draft: "",
          confidence: 0,
          humanRequired: false,
          status: "pending",
          lastSyncedAt: new Date(),
        },
      });
      imported += 1;
    }
  }

  return { connected: true, imported };
}

function mapDraft(record: Awaited<ReturnType<typeof db.reviewDraft.findMany>>[number]) {
  return {
    id: record.id,
    source: record.source,
    sourceReviewId: record.sourceReviewId,
    initials: record.customerInitials || initialsFromName(record.customerName || "Customer"),
    customer: record.customerName || "Customer",
    product: record.productTitle || "Store review",
    productType: record.productType || "",
    productTags: readStringListJson(record.productTagsJson),
    review: record.reviewBody,
    rating: record.rating || 0,
    confidence: record.confidence,
    age: ageLabel(record.sourceCreatedAt),
    createdAt: record.sourceCreatedAt?.toISOString() ?? null,
    human: record.humanRequired,
    draft: record.draft,
    draftGenerated: Boolean(record.draft.trim()),
    draftGeneratedAt: record.draftGeneratedAt?.toISOString() ?? null,
    aiModel: record.aiModelId
      ? {
          id: record.aiModelId,
          name: record.aiModelName || record.aiModelId,
          provider: record.aiProviderName || "",
          model: record.aiProviderModel || "",
        }
      : null,
    lastError: record.lastError || "",
    status: record.status,
  };
}

async function loadQueueAiConfig(shop: string) {
  const settings = await db.brandVoiceSetting.findUnique({
    where: { shop },
    select: { selectedModel: true },
  });
  const selectedModelId = settings?.selectedModel || getDefaultAiModelId();
  const aiModels = await getAiModelOptions();
  const selectedModel = aiModels.find((model) => model.id === selectedModelId) ?? aiModels[0] ?? null;
  const activeVariant = selectedModel?.activeVariant ?? null;
  const dailyLimitReached = selectedModel?.provider === "Google" && !activeVariant;

  return {
    selectedModelId,
    selectedModel,
    activeVariant,
    configured: Boolean(selectedModel?.configured) && !dailyLimitReached,
    missingEnv: selectedModel?.missingEnv ?? null,
    dailyLimitReached,
    dayKey: selectedModel?.dayKey ?? null,
    displayName: activeVariant?.name || selectedModel?.name || "AI model",
    provider: selectedModel?.provider || activeVariant?.provider || "",
  };
}

export async function getQueueData(shop: string) {
  const [reviewRecords, pendingCount, skippedCount, sentTodayCount] = await Promise.all([
    db.reviewDraft.findMany({
      where: { shop, status: { in: ["pending", "skipped"] } },
      orderBy: [{ sourceCreatedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.reviewDraft.count({ where: { shop, status: "pending" } }),
    db.reviewDraft.count({ where: { shop, status: "skipped" } }),
    db.reviewDraft.count({
      where: {
        shop,
        status: "sent",
        sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  const reviews = reviewRecords.map(mapDraft);
  const pendingReviews = reviews.filter((review) => review.status === "pending");
  const generatedPendingReviews = pendingReviews.filter((review) => review.draftGenerated);
  const products = Array.from(new Set(reviews.map((review) => review.product))).sort();

  return {
    reviews,
    products,
    stats: {
      pending: pendingCount,
      sentToday: sentTodayCount,
      skipped: skippedCount,
      ungenerated: pendingReviews.filter((review) => !review.draftGenerated).length,
      highConfidence: generatedPendingReviews.filter((review) => review.confidence >= 85).length,
      needsHuman: generatedPendingReviews.filter((review) => review.human).length,
    },
  };
}

export async function loadReviewsPageData(
  shop: string,
  options: { sync?: boolean; admin?: AdminGraphql } = {},
) {
  let connection = await db.judgeMeConnection.findUnique({ where: { shop } });
  let syncResult: Awaited<ReturnType<typeof syncJudgeMeReviews>> | null = null;
  let syncError: unknown = null;

  if (options.sync && connection?.status === "connected") {
    try {
      syncResult = await syncJudgeMeReviews(shop, options.admin);
    } catch (error) {
      syncError = error;
    }
    connection = await db.judgeMeConnection.findUnique({ where: { shop } });
  }

  return {
    connected: Boolean(connection && connection.status === "connected"),
    connectionStatus: connection?.status ?? "not_connected",
    aiConfig: await loadQueueAiConfig(shop),
    syncResult,
    syncError:
      syncError instanceof Error
        ? {
            message: syncError.message,
            details: syncError instanceof JudgeMeApiError ? syncError.details : undefined,
          }
        : null,
    ...(await getQueueData(shop)),
  };
}

async function loadBrandVoiceForDrafts(shop: string) {
  const settings = await db.brandVoiceSetting.findUnique({ where: { shop } });
  return {
    personality: settings?.personality || "",
    greeting: settings?.greeting || "Hi {name} -",
    signOff: settings?.signOff || "- The team",
    alwaysMention: readStringListJson(settings?.alwaysMentionJson),
    avoidPhrases: readStringListJson(settings?.avoidPhrasesJson),
    selectedModel: settings?.selectedModel || getDefaultAiModelId(),
    personalityStyle: settings?.personalityStyle || "balanced",
    personalityStrength: settings?.personalityStrength || "balanced",
    replyLength: settings?.replyLength || "medium",
  };
}

function productContextForRecord(
  record: Awaited<ReturnType<typeof db.reviewDraft.findMany>>[number],
  products: ShopifyProductSummary[],
) {
  const matchedProduct = findProductByTitle(products, record.productTitle);
  return {
    productTitle: record.productTitle || matchedProduct?.title || "Store review",
    productType: record.productType || matchedProduct?.productType || "",
    productTags: readStringListJson(record.productTagsJson).length
      ? readStringListJson(record.productTagsJson)
      : matchedProduct?.tags ?? [],
    matchedProduct,
  };
}

async function generateReplyForRecord(
  record: Awaited<ReturnType<typeof db.reviewDraft.findMany>>[number],
  products: ShopifyProductSummary[],
  brandVoice: Awaited<ReturnType<typeof loadBrandVoiceForDrafts>>,
  nudge?: string,
) {
  const productContext = productContextForRecord(record, products);
  const result = await generateReviewReplyText({
    modelId: brandVoice.selectedModel,
    context: {
      personality: brandVoice.personality,
      greeting: brandVoice.greeting,
      signOff: brandVoice.signOff,
      alwaysMention: brandVoice.alwaysMention,
      avoidPhrases: brandVoice.avoidPhrases,
      personalityStyle: brandVoice.personalityStyle,
      personalityStrength: brandVoice.personalityStrength,
      replyLength: brandVoice.replyLength,
      customerName: record.customerName,
      reviewBody: record.reviewBody,
      rating: record.rating,
      productTitle: productContext.productTitle,
      productType: productContext.productType,
      productTags: productContext.productTags,
      nudge,
    },
  });

  return {
    draft: result.reply,
    productType: productContext.productType || null,
    productTagsJson: compactTags(productContext.productTags),
    aiModelId: result.model.id,
    aiModelName: result.model.name,
    aiProviderName: result.model.provider,
    aiProviderModel: result.model.model,
  };
}

type DraftGenerationResult = {
  requested: number;
  generated: number;
  failed: number;
  errors: Array<{ id: string; reviewId: string; customer: string | null; message: string; details: string }>;
};

export async function generateDrafts(shop: string, ids: string[], admin?: AdminGraphql) {
  const records = await db.reviewDraft.findMany({
    where: { shop, id: { in: ids }, status: "pending", draft: "" },
  });
  const products = await loadShopifyProducts(admin).catch(() => [] as ShopifyProductSummary[]);
  const brandVoice = await loadBrandVoiceForDrafts(shop);
  const result: DraftGenerationResult = {
    requested: records.length,
    generated: 0,
    failed: 0,
    errors: [],
  };

  for (const record of records) {
    try {
      const confidence = buildConfidence(record.reviewBody, record.rating ?? 0);
      const generated = await generateReplyForRecord(record, products, brandVoice);

      await db.reviewDraft.update({
        where: { id: record.id },
        data: {
          draft: generated.draft,
          productType: generated.productType,
          productTagsJson: generated.productTagsJson,
          aiModelId: generated.aiModelId,
          aiModelName: generated.aiModelName,
          aiProviderName: generated.aiProviderName,
          aiProviderModel: generated.aiProviderModel,
          draftGeneratedAt: new Date(),
          confidence,
          humanRequired: needsHuman(record.reviewBody, record.rating ?? 0, confidence),
          lastError: null,
        },
      });
      result.generated += 1;
    } catch (error) {
      const details = compactError(error);
      result.failed += 1;
      result.errors.push({
        id: record.id,
        reviewId: record.sourceReviewId,
        customer: record.customerName,
        message: errorMessage(error),
        details,
      });
      await db.reviewDraft.update({
        where: { id: record.id },
        data: { lastError: details },
      });
    }
  }

  return result;
}

export async function regenerateDrafts(shop: string, ids: string[], nudge?: string, admin?: AdminGraphql) {
  const records = await db.reviewDraft.findMany({
    where: { shop, id: { in: ids }, status: "pending", draft: { not: "" } },
  });
  const products = await loadShopifyProducts(admin).catch(() => [] as ShopifyProductSummary[]);
  const brandVoice = await loadBrandVoiceForDrafts(shop);
  const result: DraftGenerationResult = {
    requested: records.length,
    generated: 0,
    failed: 0,
    errors: [],
  };

  for (const record of records) {
    try {
      const confidence = buildConfidence(record.reviewBody, record.rating ?? 0);
      const adjustedConfidence = nudge === "shorter" ? Math.max(60, confidence - 2) : confidence;
      const generated = await generateReplyForRecord(record, products, brandVoice, nudge);

      await db.reviewDraft.update({
        where: { id: record.id },
        data: {
          draft: generated.draft,
          productType: generated.productType,
          productTagsJson: generated.productTagsJson,
          aiModelId: generated.aiModelId,
          aiModelName: generated.aiModelName,
          aiProviderName: generated.aiProviderName,
          aiProviderModel: generated.aiProviderModel,
          draftGeneratedAt: new Date(),
          confidence: adjustedConfidence,
          humanRequired: needsHuman(record.reviewBody, record.rating ?? 0, adjustedConfidence),
          lastError: null,
        },
      });
      result.generated += 1;
    } catch (error) {
      const details = compactError(error);
      result.failed += 1;
      result.errors.push({
        id: record.id,
        reviewId: record.sourceReviewId,
        customer: record.customerName,
        message: errorMessage(error),
        details,
      });
      await db.reviewDraft.update({
        where: { id: record.id },
        data: { lastError: details },
      });
    }
  }

  return result;
}

export async function updateDraft(shop: string, id: string, draft: string) {
  const record = await db.reviewDraft.findFirst({
    where: { shop, id, status: "pending" },
  });
  if (!record) return;

  const confidence = buildConfidence(record.reviewBody, record.rating ?? 0);

  await db.reviewDraft.updateMany({
    where: { shop, id, status: "pending" },
    data: {
      draft,
      draftGeneratedAt: new Date(),
      confidence,
      humanRequired: needsHuman(record.reviewBody, record.rating ?? 0, confidence),
      lastError: null,
    },
  });
}

export async function skipDrafts(shop: string, ids: string[]) {
  const result = await db.reviewDraft.updateMany({
    where: { shop, id: { in: ids }, status: "pending" },
    data: {
      status: "skipped",
      skippedAt: new Date(),
    },
  });

  return result.count;
}

export async function restoreDrafts(shop: string, ids: string[]) {
  const result = await db.reviewDraft.updateMany({
    where: { shop, id: { in: ids }, status: "skipped" },
    data: {
      status: "pending",
      skippedAt: null,
    },
  });

  return result.count;
}

export async function approveAndSendDrafts(shop: string, ids: string[]) {
  const credentials = await getConnectedJudgeMeCredentials(shop);
  if (!credentials) {
    throw new JudgeMeApiError("Connect Judge.me before approving replies.");
  }

  const records = await db.reviewDraft.findMany({
    where: { shop, id: { in: ids }, status: "pending", draft: { not: "" } },
  });
  const errors: Array<{ id: string; reviewId: string; message: string }> = [];
  let sent = 0;

  for (const record of records) {
    try {
      const numericReviewId = Number(record.sourceReviewId);
      await callJudgeMeApi("/replies", {
        method: "POST",
        apiToken: credentials.apiToken,
        shopDomain: credentials.shopDomain,
        body: {
          review_id: Number.isNaN(numericReviewId) ? record.sourceReviewId : numericReviewId,
          send_reply_email: false,
          reply: { content: record.draft },
        },
      });

      await db.reviewDraft.update({
        where: { id: record.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          lastError: null,
        },
      });
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Judge.me send error";
      errors.push({ id: record.id, reviewId: record.sourceReviewId, message });
      await db.reviewDraft.update({
        where: { id: record.id },
        data: { lastError: message },
      });
    }
  }

  return { sent, errors };
}
