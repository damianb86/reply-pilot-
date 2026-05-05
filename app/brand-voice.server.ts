import db from "./db.server";
import {
  generateBrandVoicePersonalityText,
  generateLivePreview,
  getAiModelOptions,
  getDefaultAiModelId,
  testAiModel,
} from "./ai.server";
import {
  callJudgeMeApi,
  decryptSecret,
  getJudgeMeConnectionView,
  JudgeMeApiError,
} from "./judgeme.server";

type ImportedReply = {
  id: string;
  text: string;
  rating?: number | null;
  customer?: string | null;
  product?: string | null;
  source: string;
};

const DEFAULT_PERSONALITY =
  "I keep replies warm, concise, and specific. I thank customers without sounding scripted, mention the exact detail they shared, and keep the tone human rather than corporate. When something goes wrong, I acknowledge it directly, apologize without overexplaining, and point to the next practical step. I avoid exaggerated praise, generic customer-service phrases, and details that were not already provided.";
const DEFAULT_GREETING = "Hi {name} -";
const DEFAULT_SIGN_OFF = "- The team";
const DEFAULT_ALWAYS_MENTION = ["product detail", "what the customer noticed", "next step when needed"];
const DEFAULT_AVOID_PHRASES = ["valued customer", "reach out", "we strive"];
const DEFAULT_PERSONALITY_STYLE = "balanced";
const DEFAULT_PERSONALITY_STRENGTH = "balanced";
const DEFAULT_REPLY_LENGTH = "medium";
const DEFAULT_PREVIEW_RATING = 5;
const DEFAULT_PREVIEW_REVIEW =
  "Obsessed with these napkins. The fabric feels substantial, the print looks even better in person, and they made our dinner table feel special.";

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function normalizeRating(value: unknown) {
  const rating = readNumber(value);
  if (!rating) return DEFAULT_PREVIEW_RATING;
  return Math.max(1, Math.min(5, Math.round(rating)));
}

function readStringListJson(value: string | null | undefined, fallback: string[]) {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return fallback;

    const values = parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return values.length ? values : fallback;
  } catch {
    return fallback;
  }
}

function cleanStringList(values: string[] | undefined, fallback: string[]) {
  const seen = new Set<string>();
  const cleaned =
    values
      ?.map((value) => value.trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!value || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30) ?? [];

  return cleaned.length ? cleaned : fallback;
}

function mapBrandVoiceSettings(
  settings: Awaited<ReturnType<typeof db.brandVoiceSetting.findUnique>> | null,
) {
  return {
    persona: settings?.personality || DEFAULT_PERSONALITY,
    greeting: settings?.greeting || DEFAULT_GREETING,
    signOff: settings?.signOff || DEFAULT_SIGN_OFF,
    alwaysMention: readStringListJson(settings?.alwaysMentionJson, DEFAULT_ALWAYS_MENTION),
    avoidPhrases: readStringListJson(settings?.avoidPhrasesJson, DEFAULT_AVOID_PHRASES),
    selectedModel: settings?.selectedModel || getDefaultAiModelId(),
    livePreview: settings?.livePreview || "",
    previewReview: settings?.previewReview || DEFAULT_PREVIEW_REVIEW,
    previewProductId: settings?.previewProductId || "",
    previewProductTitle: settings?.previewProductTitle || "",
    previewProductType: settings?.previewProductType || "",
    previewProductTags: readStringListJson(settings?.previewProductTagsJson, []),
    previewRating: normalizeRating(settings?.previewRating),
    personalityStyle: settings?.personalityStyle || DEFAULT_PERSONALITY_STYLE,
    personalityStrength: settings?.personalityStrength || DEFAULT_PERSONALITY_STRENGTH,
    replyLength: settings?.replyLength || DEFAULT_REPLY_LENGTH,
  };
}

function replyTextFromValue(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(replyTextFromValue);
  }

  const object = readObject(value);
  if (!Object.keys(object).length) return [];

  return [
    object.content,
    object.body,
    object.text,
    object.message,
    object.reply,
    object.reply_body,
    object.reply_content,
  ].flatMap(replyTextFromValue);
}

function extractReplyTexts(rawReview: unknown) {
  const review = readObject(rawReview);
  const replyKeys = [
    "reply",
    "replies",
    "reply_body",
    "reply_content",
    "public_reply",
    "private_reply",
    "merchant_reply",
    "shop_reply",
    "answer",
  ];

  const directReplies = replyKeys.flatMap((key) => replyTextFromValue(review[key]));
  const looseReplies = Object.entries(review)
    .filter(([key]) => key.toLowerCase().includes("reply"))
    .flatMap(([, value]) => replyTextFromValue(value));

  return Array.from(new Set([...directReplies, ...looseReplies])).filter(Boolean);
}

function normalizeReply(reply: ImportedReply, index: number): ImportedReply {
  return {
    ...reply,
    id: reply.id || `reply-${index}`,
    text: reply.text.trim(),
    customer: reply.customer?.trim() || "Customer",
    product: reply.product?.trim() || "Store review",
  };
}

function uniqueReplies(replies: ImportedReply[], limit: number) {
  const seen = new Set<string>();
  const results: ImportedReply[] = [];

  for (const reply of replies.map(normalizeReply)) {
    const key = reply.text.toLowerCase();
    if (!reply.text || seen.has(key)) continue;
    seen.add(key);
    results.push(reply);
    if (results.length >= limit) break;
  }

  return results;
}

async function getConnectedJudgeMeCredentials(shop: string) {
  const connection = await db.judgeMeConnection.findUnique({ where: { shop } });
  if (!connection || connection.status !== "connected") {
    throw new JudgeMeApiError("Connect Judge.me before importing reply examples.");
  }

  return {
    shopDomain: connection.shopDomain,
    apiToken: decryptSecret(connection.encryptedApiToken),
  };
}

export async function loadBrandVoicePageData(shop: string) {
  const [connection, recentSentReplies, settings, aiModels] = await Promise.all([
    getJudgeMeConnectionView(shop),
    db.reviewDraft.findMany({
      where: { shop, status: "sent" },
      orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
      take: 10,
    }),
    db.brandVoiceSetting.findUnique({ where: { shop } }),
    getAiModelOptions(),
  ]);
  const settingsView = mapBrandVoiceSettings(settings);

  return {
    connection,
    settings: settingsView,
    recentSentReplies: recentSentReplies.map((reply, index) => ({
      id: reply.id,
      text: reply.draft,
      rating: reply.rating,
      customer: reply.customerName,
      product: reply.productTitle,
      source: index === 0 ? "Latest Reply Pilot reply" : "Reply Pilot sent reply",
    })),
    aiModels,
    defaultAiModelId: getDefaultAiModelId(),
  };
}

async function importReplyExamples(shop: string, limit: number) {
  const safeLimit = Math.max(5, Math.min(limit || 25, 50));
  const credentials = await getConnectedJudgeMeCredentials(shop);

  const sentReplies = await db.reviewDraft.findMany({
    where: { shop, status: "sent" },
    orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
    take: safeLimit,
  });

  const appReplies: ImportedReply[] = sentReplies.map((reply) => ({
    id: reply.id,
    text: reply.draft,
    rating: reply.rating,
    customer: reply.customerName,
    product: reply.productTitle,
    source: "Reply Pilot sent reply",
  }));

  const reviewsResponse = await callJudgeMeApi("/reviews", {
    apiToken: credentials.apiToken,
    shopDomain: credentials.shopDomain,
    searchParams: { per_page: safeLimit, page: 1 },
  });
  const reviews = Array.isArray(readObject(reviewsResponse).reviews)
    ? (readObject(reviewsResponse).reviews as unknown[])
    : [];

  const judgeMeReplies: ImportedReply[] = reviews.flatMap((rawReview, reviewIndex) => {
    const review = readObject(rawReview);
    const reviewer = readObject(review.reviewer);
    const customer =
      readString(reviewer.name) ||
      readString(review.name) ||
      readString(review.reviewer_name) ||
      "Customer";
    const product = readString(review.product_title) || "Store review";
    const rating = readNumber(review.rating);

    return extractReplyTexts(rawReview).map((text, replyIndex) => ({
      id: `judgeme-${String(review.id ?? reviewIndex)}-${replyIndex}`,
      text,
      rating,
      customer,
      product,
      source: "Judge.me reply",
    }));
  });

  const importedReplies = uniqueReplies([...appReplies, ...judgeMeReplies], safeLimit);

  return {
    importedReplies,
    importedCount: importedReplies.length,
    requestedCount: safeLimit,
    sourceNote:
      judgeMeReplies.length > 0
        ? "Included Judge.me reply bodies and sent Reply Pilot history."
        : "Judge.me did not return reply bodies; imported stored sent replies for this shop.",
  };
}

export async function importReplyExamplesForBrandVoice(
  shop: string,
  limit: number,
) {
  return importReplyExamples(shop, limit);
}

export async function generateBrandVoicePersonality(input: {
  modelId?: string | null;
  replies: ImportedReply[];
  personality?: string;
  greeting?: string;
  signOff?: string;
  alwaysMention?: string[];
  avoidPhrases?: string[];
  previewReview?: string;
  previewRating?: number;
  previewProductTitle?: string;
  previewProductType?: string;
  previewProductTags?: string[];
  personalityStyle?: string;
  personalityStrength?: string;
  replyLength?: string;
}) {
  const personalityResult = await generateBrandVoicePersonalityText({
    modelId: input.modelId,
    replies: input.replies,
    context: {
      personality: input.personality,
      greeting: input.greeting,
      signOff: input.signOff,
      alwaysMention: input.alwaysMention,
      avoidPhrases: input.avoidPhrases,
      previewReview: input.previewReview,
      previewRating: input.previewRating,
      previewProductTitle: input.previewProductTitle,
      previewProductType: input.previewProductType,
      previewProductTags: input.previewProductTags,
      personalityStyle: input.personalityStyle,
      personalityStrength: input.personalityStrength,
      replyLength: input.replyLength,
    },
  });
  const previewResult = await generateLivePreview({
    modelId: input.modelId,
    context: {
      personality: personalityResult.personality,
      greeting: input.greeting,
      signOff: input.signOff,
      alwaysMention: input.alwaysMention,
      avoidPhrases: input.avoidPhrases,
      previewReview: input.previewReview,
      previewRating: input.previewRating,
      previewProductTitle: input.previewProductTitle,
      previewProductType: input.previewProductType,
      previewProductTags: input.previewProductTags,
      personalityStyle: input.personalityStyle,
      personalityStrength: input.personalityStrength,
      replyLength: input.replyLength,
    },
  });

  return {
    personality: personalityResult.personality,
    livePreview: previewResult.livePreview,
    model: personalityResult.model,
  };
}

export async function saveBrandVoiceSettings(
  shop: string,
  input: {
    personality?: string;
    greeting?: string;
    signOff?: string;
    alwaysMention?: string[];
    avoidPhrases?: string[];
    selectedModel?: string;
    livePreview?: string;
    previewReview?: string;
    previewProductId?: string;
    previewProductTitle?: string;
    previewProductType?: string;
    previewProductTags?: string[];
    previewRating?: number;
    personalityStyle?: string;
    personalityStrength?: string;
    replyLength?: string;
  },
) {
  const data = {
    personality: input.personality?.trim() || DEFAULT_PERSONALITY,
    greeting: input.greeting?.trim() || DEFAULT_GREETING,
    signOff: input.signOff?.trim() || DEFAULT_SIGN_OFF,
    alwaysMentionJson: JSON.stringify(cleanStringList(input.alwaysMention, DEFAULT_ALWAYS_MENTION)),
    avoidPhrasesJson: JSON.stringify(cleanStringList(input.avoidPhrases, DEFAULT_AVOID_PHRASES)),
    selectedModel: input.selectedModel?.trim() || getDefaultAiModelId(),
    livePreview: input.livePreview?.trim() || null,
    previewReview: input.previewReview?.trim() || DEFAULT_PREVIEW_REVIEW,
    previewProductId: input.previewProductId?.trim() || null,
    previewProductTitle: input.previewProductTitle?.trim() || null,
    previewProductType: input.previewProductType?.trim() || null,
    previewProductTagsJson: JSON.stringify(cleanStringList(input.previewProductTags, [])),
    previewRating: normalizeRating(input.previewRating),
    personalityStyle: input.personalityStyle?.trim() || DEFAULT_PERSONALITY_STYLE,
    personalityStrength: input.personalityStrength?.trim() || DEFAULT_PERSONALITY_STRENGTH,
    replyLength: input.replyLength?.trim() || DEFAULT_REPLY_LENGTH,
  };

  const settings = await db.brandVoiceSetting.upsert({
    where: { shop },
    update: data,
    create: {
      shop,
      ...data,
    },
  });

  return mapBrandVoiceSettings(settings);
}

export async function generateBrandVoicePreview(input: {
  modelId?: string | null;
  personality?: string;
  greeting?: string;
  signOff?: string;
  alwaysMention?: string[];
  avoidPhrases?: string[];
  previewReview?: string;
  previewRating?: number;
  previewProductTitle?: string;
  previewProductType?: string;
  previewProductTags?: string[];
  personalityStyle?: string;
  personalityStrength?: string;
  replyLength?: string;
}) {
  return generateLivePreview({
    modelId: input.modelId,
    context: {
      personality: input.personality,
      greeting: input.greeting,
      signOff: input.signOff,
      alwaysMention: input.alwaysMention,
      avoidPhrases: input.avoidPhrases,
      previewReview: input.previewReview,
      previewRating: input.previewRating,
      previewProductTitle: input.previewProductTitle,
      previewProductType: input.previewProductType,
      previewProductTags: input.previewProductTags,
      personalityStyle: input.personalityStyle,
      personalityStrength: input.personalityStrength,
      replyLength: input.replyLength,
    },
  });
}

export async function testBrandVoiceAiModel(modelId?: string | null) {
  return testAiModel(modelId);
}
