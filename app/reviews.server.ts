import db from "./db.server";
import {
  generateReviewReplyRevisionText,
  generateReviewReplyText,
  getAiModelOptions,
  getDefaultAiModelId,
  resolveAiModelId,
} from "./ai.server";
import { callJudgeMeApi, decryptSecret, JudgeMeApiError } from "./judgeme.server";
import {
  cleanupExpiredReviewHistory,
  isSameTimeZoneDay,
  loadAppSettings,
  reviewNeedsHuman,
  type AppSettings,
} from "./settings.server";
import {
  creditCostForOperation,
  getCreditOverview,
  refundCredits,
  spendCredits,
} from "./credits.server";
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

function safeJsonParse(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
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

type ConfidenceInput = {
  reviewBody: string;
  rating: number;
  draft?: string | null;
  productTitle?: string | null;
  productType?: string | null;
  productTags?: string[] | null;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "because",
  "but",
  "con",
  "del",
  "from",
  "have",
  "just",
  "para",
  "that",
  "the",
  "this",
  "una",
  "was",
  "were",
  "when",
  "with",
  "you",
  "your",
]);

const SEVERE_REVIEW_TERMS = [
  "allergic",
  "allergy",
  "chargeback",
  "counterfeit",
  "dangerous",
  "estafa",
  "fake",
  "fraud",
  "fraude",
  "injury",
  "lawsuit",
  "legal",
  "lesion",
  "peligroso",
  "scam",
  "toxic",
  "unsafe",
];

const SERVICE_REVIEW_TERMS = [
  "broken",
  "cancelled",
  "damaged",
  "dañado",
  "defective",
  "delivery",
  "doesn't work",
  "exchange",
  "late",
  "lost",
  "missing",
  "never arrived",
  "no llego",
  "not arrived",
  "refund",
  "reembolso",
  "return",
  "roto",
  "shipping",
  "stopped working",
  "tracking",
  "unusable",
  "wrong item",
];

const NEGATIVE_REVIEW_TERMS = [
  "angry",
  "awful",
  "bad",
  "cheap",
  "decepcionado",
  "disappointed",
  "enojado",
  "hate",
  "horrible",
  "nothing",
  "not worth",
  "peor",
  "poor quality",
  "terrible",
  "unacceptable",
  "upset",
  "worst",
];

const SUPPORTIVE_REPLY_TERMS = [
  "apologies",
  "apologize",
  "ayuda",
  "ayudarte",
  "contact",
  "email",
  "escribenos",
  "help",
  "lamentamos",
  "look into",
  "make this right",
  "revisar",
  "sentimos",
  "sorry",
  "support",
  "understand",
];

const ROBOTIC_REPLY_PATTERNS = [
  "as an ai",
  "balanced review",
  "details like that matter",
  "i cannot",
  "it is helpful to hear",
  "practical tradeoffs",
  "real park conditions",
  "thank you for your feedback",
  "we appreciate you taking the time to point out both",
  "we value your feedback",
];

const RISKY_REPLY_PROMISES = [
  "always",
  "discount",
  "free",
  "guarantee",
  "immediately",
  "never",
  "refund",
  "replace",
  "replacement",
];

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function textWords(value?: string | null) {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}']+/u)
    .map((word) => word.trim())
    .filter(Boolean);
}

function wordCount(value?: string | null) {
  return textWords(value).length;
}

function countPhraseMatches(text: string, phrases: string[]) {
  const normalized = normalizeText(text);
  return phrases.filter((phrase) => normalized.includes(normalizeText(phrase))).length;
}

function clampScore(value: number) {
  return Math.max(22, Math.min(98, Math.round(value)));
}

function uniqueNumbers(value?: string | null) {
  return Array.from(new Set((value ?? "").match(/\b\d+(?:[.,]\d+)?\b/g) ?? []));
}

function meaningfulKeywords(...values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => textWords(value))
        .filter((word) => word.length >= 5 && !STOP_WORDS.has(word))
        .slice(0, 60),
    ),
  );
}

function keywordOverlap(draft: string, keywords: string[]) {
  const draftWords = new Set(textWords(draft));
  return keywords.filter((keyword) => draftWords.has(keyword)).length;
}

function buildConfidence(input: ConfidenceInput) {
  const reviewBody = input.reviewBody || "";
  const draft = input.draft || "";
  const reviewWords = wordCount(reviewBody);
  const draftWords = wordCount(draft);
  const severeSignals = countPhraseMatches(reviewBody, SEVERE_REVIEW_TERMS);
  const serviceSignals = countPhraseMatches(reviewBody, SERVICE_REVIEW_TERMS);
  const negativeSignals = countPhraseMatches(reviewBody, NEGATIVE_REVIEW_TERMS);
  const totalRiskSignals = severeSignals + serviceSignals + negativeSignals;
  const hasDraft = Boolean(draft.trim());
  let score = 72;

  score += input.rating >= 5 ? 4 : input.rating === 4 ? 2 : input.rating === 3 ? 0 : input.rating === 2 ? -3 : -5;

  if (reviewWords <= 8) {
    score += input.rating >= 4 ? 5 : -2;
  } else if (reviewWords <= 45) {
    score += 4;
  } else if (reviewWords <= 110) {
    score += 0;
  } else if (reviewWords <= 220) {
    score -= 4;
  } else {
    score -= 7;
  }

  score -= severeSignals * 14;
  score -= serviceSignals * 7;
  score -= negativeSignals * 4;
  if (totalRiskSignals >= 3) score -= 5;

  if (!hasDraft) return clampScore(score - 28);

  if (draftWords < 12) {
    score -= 14;
  } else if (draftWords <= 35) {
    score += 5;
  } else if (draftWords <= 95) {
    score += 8;
  } else if (draftWords <= 150) {
    score += 1;
  } else if (draftWords <= 220) {
    score -= 6;
  } else {
    score -= 12;
  }

  if (reviewWords >= 80 && draftWords < 35) score -= 7;
  if (reviewWords <= 25 && draftWords > 110) score -= 7;

  const reviewKeywords = meaningfulKeywords(
    reviewBody,
    input.productTitle,
    input.productType,
    ...(input.productTags ?? []),
  );
  const overlap = keywordOverlap(draft, reviewKeywords);
  if (reviewKeywords.length >= 4) {
    score += Math.min(10, overlap * 3);
    if (overlap === 0) score -= 9;
  }

  const supportiveSignals = countPhraseMatches(draft, SUPPORTIVE_REPLY_TERMS);
  if (totalRiskSignals > 0) {
    score += supportiveSignals ? Math.min(9, supportiveSignals * 3) : -10;
  }
  if (input.rating <= 2 && supportiveSignals === 0) score -= 8;

  const roboticSignals = countPhraseMatches(draft, ROBOTIC_REPLY_PATTERNS);
  score -= roboticSignals * 10;

  const reviewNumbers = new Set([
    ...uniqueNumbers(reviewBody),
    ...uniqueNumbers(input.productTitle),
    ...uniqueNumbers(input.productType),
    ...(input.productTags ?? []).flatMap((tag) => uniqueNumbers(tag)),
    String(input.rating),
  ]);
  const unsupportedNumbers = uniqueNumbers(draft).filter((number) => !reviewNumbers.has(number));
  score -= Math.min(18, unsupportedNumbers.length * 9);

  const riskyPromises = countPhraseMatches(draft, RISKY_REPLY_PROMISES);
  if (riskyPromises && serviceSignals + severeSignals > 0) score -= Math.min(10, riskyPromises * 3);

  return clampScore(score);
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

type JudgeMeSourceReply = {
  present: boolean;
  content: string;
  createdAt: string | null;
  author: string;
  visibility: string;
  contentAvailable: boolean;
};

function readReplyContent(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const object = readObject(value);
  const direct =
    readString(object.content) ||
    readString(object.body) ||
    readString(object.text) ||
    readString(object.message) ||
    readString(object.comment);

  if (direct) return direct.trim();

  if (object.reply && object.reply !== value) return readReplyContent(object.reply);
  if (object.public_reply && object.public_reply !== value) return readReplyContent(object.public_reply);
  if (object.response && object.response !== value) return readReplyContent(object.response);

  return "";
}

function readReplyDate(value: unknown): string | null {
  const object = readObject(value);
  const date =
    readString(object.created_at) ||
    readString(object.updated_at) ||
    readString(object.replied_at) ||
    readString(object.reply_date) ||
    readString(object.date);

  return date || null;
}

function readReplyAuthor(value: unknown): string {
  const object = readObject(value);
  const author = readObject(object.author);
  return (
    readString(object.author_name) ||
    readString(object.name) ||
    readString(author.name) ||
    readString(author.email) ||
    "Judge.me"
  );
}

function sourceReplyFromCandidate(value: unknown, visibility: string): JudgeMeSourceReply | null {
  if (value === undefined || value === null || value === false) return null;

  const content = readReplyContent(value);
  if (!content && typeof value !== "object") return null;
  if (!content && !readReplyDate(value) && !hasReplyMetadata(readObject(value))) return null;

  return {
    present: true,
    content,
    createdAt: readReplyDate(value),
    author: readReplyAuthor(value),
    visibility,
    contentAvailable: Boolean(content),
  };
}

function hasReplyMetadata(review: Record<string, unknown>) {
  const booleanFields = [
    review.has_reply,
    review.has_replies,
    review.has_public_reply,
    review.replied,
    review.replied_by_shop,
    review.with_replies,
  ];
  if (booleanFields.some((value) => value === true || value === "true")) return true;

  const countFields = [
    review.replies_count,
    review.reply_count,
    review.public_replies_count,
    review.comments_count,
  ];
  if (countFields.some((value) => readNumber(value, 0) > 0)) return true;

  return Boolean(readString(review.reply_date) || readString(review.replied_at));
}

function extractJudgeMeSourceReply(rawReview: unknown): JudgeMeSourceReply | null {
  const review = readObject(rawReview);
  const directCandidates: Array<[unknown, string]> = [
    [review.reply, "public"],
    [review.public_reply, "public"],
    [review.shop_reply, "public"],
    [review.merchant_reply, "public"],
    [review.store_reply, "public"],
    [review.response, "public"],
    [review.answer, "public"],
  ];

  const arrayCandidates: Array<[unknown, string]> = [
    [review.replies, "public"],
    [review.public_replies, "public"],
    [review.comments, "public"],
    [review.answers, "public"],
  ];

  const foundReplies = [
    ...directCandidates
      .map(([value, visibility]) => sourceReplyFromCandidate(value, visibility))
      .filter((reply): reply is JudgeMeSourceReply => Boolean(reply)),
    ...arrayCandidates.flatMap(([value, visibility]) => (
      Array.isArray(value)
        ? value
            .map((item) => sourceReplyFromCandidate(item, visibility))
            .filter((reply): reply is JudgeMeSourceReply => Boolean(reply))
        : []
    )),
  ];

  const withContent = foundReplies.filter((reply) => reply.contentAvailable);
  const sortedReplies = (withContent.length ? withContent : foundReplies).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  if (sortedReplies[0]) return sortedReplies[0];

  if (hasReplyMetadata(review)) {
    return {
      present: true,
      content: "",
      createdAt: readReplyDate(review),
      author: "Judge.me",
      visibility: "public",
      contentAvailable: false,
    };
  }

  return null;
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
  const sourceReview = safeJsonParse(record.sourceReviewJson);
  const judgeMeReply = extractJudgeMeSourceReply(sourceReview);

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
    judgeMeReply,
    hasJudgeMeReply: Boolean(judgeMeReply?.present),
    lastError: record.lastError || "",
    status: record.status,
  };
}

async function loadQueueAiConfig(shop: string) {
  const settings = await db.brandVoiceSetting.findUnique({
    where: { shop },
    select: { selectedModel: true },
  });
  const selectedModelId = resolveAiModelId(settings?.selectedModel || getDefaultAiModelId());
  const aiModels = await getAiModelOptions();
  const selectedModel = aiModels.find((model) => model.id === selectedModelId) ?? aiModels[0] ?? null;
  const activeVariant = selectedModel?.activeVariant ?? null;
  const dailyLimitReached = selectedModel?.provider === "Google" && !activeVariant;
  const replyCreditCost = creditCostForOperation(selectedModelId, "reply");

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
    replyCreditCost,
  };
}

export async function getQueueData(shop: string, settings?: AppSettings) {
  const appSettings = settings ?? (await loadAppSettings(shop));
  const reviewRecords = await db.reviewDraft.findMany({
    where: { shop, status: { in: ["pending", "skipped", "sent"] } },
    orderBy: [{ sourceCreatedAt: "desc" }, { createdAt: "desc" }],
  });
  const reviews = reviewRecords.map(mapDraft);
  const pendingReviews = reviews.filter((review) => review.status === "pending");
  const generatedPendingReviews = pendingReviews.filter((review) => review.draftGenerated);
  const judgeMeRepliedReviews = pendingReviews.filter((review) => review.hasJudgeMeReply);
  const products = Array.from(new Set(reviews.map((review) => review.product))).sort();

  return {
    reviews,
    products,
    settings: appSettings,
    stats: {
      pending: reviewRecords.filter((record) => record.status === "pending").length,
      sentToday: reviewRecords.filter((record) =>
        record.status === "sent" && isSameTimeZoneDay(record.sentAt, new Date(), appSettings.timezone),
      ).length,
      sent: reviewRecords.filter((record) => record.status === "sent").length,
      skipped: reviewRecords.filter((record) => record.status === "skipped").length,
      judgeMeReplied: judgeMeRepliedReviews.length,
      ungenerated: pendingReviews.filter((review) => !review.draftGenerated && !review.hasJudgeMeReply).length,
      highConfidence: generatedPendingReviews.filter((review) =>
        review.confidence >= appSettings.highConfidenceThreshold,
      ).length,
      needsHuman: generatedPendingReviews.filter((review) => review.human).length,
    },
  };
}

export async function loadReviewsPageData(
  shop: string,
  options: { sync?: boolean; admin?: AdminGraphql } = {},
) {
  const appSettings = await loadAppSettings(shop);
  await cleanupExpiredReviewHistory(shop, appSettings);
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
    credits: await getCreditOverview(shop),
    syncResult,
    syncError:
      syncError instanceof Error
        ? {
            message: syncError.message,
            details: syncError instanceof JudgeMeApiError ? syncError.details : undefined,
          }
        : null,
    ...(await getQueueData(shop, appSettings)),
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
    selectedModel: resolveAiModelId(settings?.selectedModel || getDefaultAiModelId()),
    personalityStyle: settings?.personalityStyle || "use_personality",
    personalityStrength: settings?.personalityStrength || "balanced",
    replyLength: settings?.replyLength || "adaptive",
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
    productTitle: productContext.productTitle,
    productType: productContext.productType || null,
    productTags: productContext.productTags,
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
  credits: {
    costPerDraft: number;
    requested: number;
    spent: number;
    refunded: number;
  };
  errors: Array<{ id: string; reviewId: string; customer: string | null; message: string; details: string }>;
};

export async function generateDrafts(shop: string, ids: string[], admin?: AdminGraphql) {
  const records = await db.reviewDraft.findMany({
    where: { shop, id: { in: ids }, status: "pending", draft: "" },
  });
  const [products, brandVoice, appSettings] = await Promise.all([
    loadShopifyProducts(admin).catch(() => [] as ShopifyProductSummary[]),
    loadBrandVoiceForDrafts(shop),
    loadAppSettings(shop),
  ]);
  const result: DraftGenerationResult = {
    requested: records.length,
    generated: 0,
    failed: 0,
    credits: {
      costPerDraft: creditCostForOperation(brandVoice.selectedModel, "reply"),
      requested: 0,
      spent: 0,
      refunded: 0,
    },
    errors: [],
  };
  result.credits.requested = result.credits.costPerDraft * records.length;
  const charge = await spendCredits(shop, result.credits.requested, {
    description: `Generate ${records.length} review ${records.length === 1 ? "reply" : "replies"}`,
    referenceType: "queue_generate",
    referenceId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    metadata: { modelId: brandVoice.selectedModel, count: records.length },
  });

  for (const record of records) {
    try {
      const generated = await generateReplyForRecord(record, products, brandVoice);
      const confidence = buildConfidence({
        reviewBody: record.reviewBody,
        rating: record.rating ?? 0,
        draft: generated.draft,
        productTitle: generated.productTitle,
        productType: generated.productType,
        productTags: generated.productTags,
      });

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
          draftEditedAt: null,
          draftRevisionCount: 0,
          confidence,
          humanRequired: reviewNeedsHuman({
            reviewBody: record.reviewBody,
            rating: record.rating ?? 0,
            confidence,
            settings: appSettings,
          }),
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

  result.credits.refunded = result.failed * result.credits.costPerDraft;
  result.credits.spent = Math.max(0, charge.amount - result.credits.refunded);
  if (result.credits.refunded) {
    await refundCredits(shop, result.credits.refunded, {
      description: `Refund ${result.failed} failed review ${result.failed === 1 ? "reply" : "replies"}`,
      referenceType: "queue_generate_refund",
      referenceId: charge.id ?? undefined,
      metadata: { modelId: brandVoice.selectedModel, failed: result.failed },
    });
  }

  return result;
}

export async function regenerateDrafts(shop: string, ids: string[], nudge?: string, admin?: AdminGraphql) {
  const records = await db.reviewDraft.findMany({
    where: { shop, id: { in: ids }, status: "pending", draft: { not: "" } },
  });
  const [products, brandVoice, appSettings] = await Promise.all([
    loadShopifyProducts(admin).catch(() => [] as ShopifyProductSummary[]),
    loadBrandVoiceForDrafts(shop),
    loadAppSettings(shop),
  ]);
  const result: DraftGenerationResult = {
    requested: records.length,
    generated: 0,
    failed: 0,
    credits: {
      costPerDraft: creditCostForOperation(brandVoice.selectedModel, "reply"),
      requested: 0,
      spent: 0,
      refunded: 0,
    },
    errors: [],
  };
  result.credits.requested = result.credits.costPerDraft * records.length;
  const charge = await spendCredits(shop, result.credits.requested, {
    description: `Regenerate ${records.length} review ${records.length === 1 ? "reply" : "replies"}`,
    referenceType: "queue_regenerate",
    referenceId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    metadata: { modelId: brandVoice.selectedModel, count: records.length },
  });

  for (const record of records) {
    try {
      const generated = await generateReplyForRecord(record, products, brandVoice, nudge);
      const confidence = buildConfidence({
        reviewBody: record.reviewBody,
        rating: record.rating ?? 0,
        draft: generated.draft,
        productTitle: generated.productTitle,
        productType: generated.productType,
        productTags: generated.productTags,
      });

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
          draftEditedAt: null,
          draftRevisionCount: 0,
          confidence,
          humanRequired: reviewNeedsHuman({
            reviewBody: record.reviewBody,
            rating: record.rating ?? 0,
            confidence,
            settings: appSettings,
          }),
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

  result.credits.refunded = result.failed * result.credits.costPerDraft;
  result.credits.spent = Math.max(0, charge.amount - result.credits.refunded);
  if (result.credits.refunded) {
    await refundCredits(shop, result.credits.refunded, {
      description: `Refund ${result.failed} failed regenerated ${result.failed === 1 ? "reply" : "replies"}`,
      referenceType: "queue_regenerate_refund",
      referenceId: charge.id ?? undefined,
      metadata: { modelId: brandVoice.selectedModel, failed: result.failed },
    });
  }

  return result;
}

export async function updateDraft(shop: string, id: string, draft: string) {
  const record = await db.reviewDraft.findFirst({
    where: { shop, id, status: "pending" },
  });
  if (!record) return;

  const appSettings = await loadAppSettings(shop);
  const confidence = buildConfidence({
    reviewBody: record.reviewBody,
    rating: record.rating ?? 0,
    draft,
    productTitle: record.productTitle,
    productType: record.productType,
    productTags: readStringListJson(record.productTagsJson),
  });

  await db.reviewDraft.updateMany({
    where: { shop, id, status: "pending" },
    data: {
      draft,
      draftGeneratedAt: new Date(),
      draftEditedAt: new Date(),
      draftRevisionCount: { increment: 1 },
      confidence,
      humanRequired: reviewNeedsHuman({
        reviewBody: record.reviewBody,
        rating: record.rating ?? 0,
        confidence,
        settings: appSettings,
      }),
      lastError: null,
    },
  });
}

export async function reviseDraft(shop: string, id: string, instruction: string, admin?: AdminGraphql) {
  const trimmedInstruction = instruction.trim().slice(0, 100);
  if (!trimmedInstruction) return null;

  const record = await db.reviewDraft.findFirst({
    where: { shop, id, status: "pending", draft: { not: "" } },
  });
  if (!record) return null;

  const [products, brandVoice, appSettings] = await Promise.all([
    loadShopifyProducts(admin).catch(() => [] as ShopifyProductSummary[]),
    loadBrandVoiceForDrafts(shop),
    loadAppSettings(shop),
  ]);
  const productContext = productContextForRecord(record, products);
  const cost = creditCostForOperation(brandVoice.selectedModel, "reply");
  const charge = await spendCredits(shop, cost, {
    description: "Revise review reply",
    referenceType: "queue_revise",
    referenceId: record.id,
    metadata: { modelId: brandVoice.selectedModel },
  });

  try {
    const result = await generateReviewReplyRevisionText({
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
        currentDraft: record.draft,
        instruction: trimmedInstruction,
      },
    });
    const confidence = buildConfidence({
      reviewBody: record.reviewBody,
      rating: record.rating ?? 0,
      draft: result.reply,
      productTitle: productContext.productTitle,
      productType: productContext.productType,
      productTags: productContext.productTags,
    });

    await db.reviewDraft.update({
      where: { id: record.id },
      data: {
        draft: result.reply,
        productType: productContext.productType || null,
        productTagsJson: compactTags(productContext.productTags),
        aiModelId: result.model.id,
        aiModelName: result.model.name,
        aiProviderName: result.model.provider,
        aiProviderModel: result.model.model,
        draftEditedAt: new Date(),
        draftRevisionCount: { increment: 1 },
        confidence,
        humanRequired: reviewNeedsHuman({
          reviewBody: record.reviewBody,
          rating: record.rating ?? 0,
          confidence,
          settings: appSettings,
        }),
        lastError: null,
      },
    });

    return { id: record.id, model: result.model, credits: { spent: charge.amount } };
  } catch (error) {
    await refundCredits(shop, cost, {
      description: "Refund failed review reply revision",
      referenceType: "queue_revise_refund",
      referenceId: charge.id ?? undefined,
      metadata: { modelId: brandVoice.selectedModel, reviewId: record.id },
    });
    throw error;
  }
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

  const appSettings = await loadAppSettings(shop);
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
          send_reply_email: appSettings.sendReplyEmail,
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
