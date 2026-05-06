import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import BrandVoicePage from "../../src/pages/BrandVoicePage";
import {
  generateBrandVoicePersonality,
  generateBrandVoicePreview,
  importReplyExamplesForBrandVoice,
  loadBrandVoicePageData,
  saveBrandVoiceSettings,
} from "../brand-voice.server";
import { getAiModelOptions, serializeAiError } from "../ai.server";
import {
  CreditError,
  creditCostForOperation,
  getCreditOverview,
  refundCredits,
  serializeCreditError,
  spendCredits,
} from "../credits.server";
import { serializeJudgeMeError } from "../judgeme.server";
import { authenticate } from "../shopify.server";
import { loadShopifyProductById } from "../shopify-products.server";

type ParsedReply = {
  id: string;
  text: string;
  rating: number | null;
  customer: string | null;
  product: string | null;
  source: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  return loadBrandVoicePageData(session.shop);
}

function parseImportedReplies(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const data = JSON.parse(value) as unknown;
    if (!Array.isArray(data)) return [];

    return data
      .map((item, index) => {
        if (typeof item === "string") {
          const text = item.trim();
          return text
            ? {
                id: `reply-${index}`,
                text,
                rating: null,
                customer: null,
                product: null,
                source: "Imported reply",
              }
            : null;
        }

        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const reply = item as Record<string, unknown>;
        const text = typeof reply.text === "string" ? reply.text.trim() : "";
        if (!text) return null;

        return {
          id: typeof reply.id === "string" && reply.id ? reply.id : `reply-${index}`,
          text,
          rating: typeof reply.rating === "number" ? reply.rating : null,
          customer: typeof reply.customer === "string" ? reply.customer : null,
          product: typeof reply.product === "string" ? reply.product : null,
          source: typeof reply.source === "string" && reply.source ? reply.source : "Imported reply",
        };
      })
      .filter((reply): reply is ParsedReply => Boolean(reply))
      .slice(0, 50);
  } catch {
    return [];
  }
}

function parseStringList(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const data = JSON.parse(value) as unknown;
    if (!Array.isArray(data)) return [];

    const seen = new Set<string>();
    return data
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        const key = item.toLowerCase();
        if (!item || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30);
  } catch {
    return [];
  }
}

async function withCreditCharge<T>(
  shop: string,
  modelId: string,
  operation: "preview" | "personality",
  description: string,
  callback: () => Promise<T>,
) {
  const amount = creditCostForOperation(modelId, operation);
  const charge = await spendCredits(shop, amount, {
    description,
    referenceType: `brand_voice_${operation}`,
    referenceId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    metadata: { modelId, operation },
  });

  try {
    const result = await callback();
    return { result, creditCharge: charge };
  } catch (error) {
    await refundCredits(shop, amount, {
      description: `Refund for failed ${description.toLowerCase()}`,
      referenceType: `brand_voice_${operation}_refund`,
      referenceId: charge.id ?? undefined,
      metadata: { modelId, operation },
    });
    throw error;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "load-preview-product") {
      const productId = String(formData.get("productId") ?? "");
      const product = await loadShopifyProductById(admin, productId);

      return product
        ? {
            ok: true,
            intent,
            product,
          }
        : {
            ok: false,
            intent,
            message: "Selected product could not be loaded.",
          };
    }

    if (intent === "save-settings") {
      const settings = await saveBrandVoiceSettings(session.shop, {
        personality: String(formData.get("personality") ?? ""),
        greeting: String(formData.get("greeting") ?? ""),
        signOff: String(formData.get("signOff") ?? ""),
        alwaysMention: parseStringList(formData.get("alwaysMention")),
        avoidPhrases: parseStringList(formData.get("avoidPhrases")),
        selectedModel: String(formData.get("modelId") ?? ""),
        livePreview: String(formData.get("livePreview") ?? ""),
        previewReview: String(formData.get("previewReview") ?? ""),
        previewProductId: String(formData.get("previewProductId") ?? ""),
        previewProductTitle: String(formData.get("previewProductTitle") ?? ""),
        previewProductType: String(formData.get("previewProductType") ?? ""),
        previewProductTags: parseStringList(formData.get("previewProductTags")),
        previewRating: Number(formData.get("previewRating") ?? 5),
        personalityStyle: String(formData.get("personalityStyle") ?? ""),
        personalityStrength: String(formData.get("personalityStrength") ?? ""),
        replyLength: String(formData.get("replyLength") ?? ""),
      });

      return {
        ok: true,
        intent,
        message: "Brand voice saved.",
        settings,
        aiModels: await getAiModelOptions(),
      };
    }

    if (intent === "import-replies") {
      const limit = Number(formData.get("limit") ?? 25);
      const result = await importReplyExamplesForBrandVoice(session.shop, limit);

      return {
        ok: result.importedCount > 0,
        intent,
        message: result.importedCount
          ? result.importedCount === 1
            ? "Imported 1 reply."
            : `Imported ${result.importedCount} replies.`
          : "No reply bodies were available to import for this shop yet.",
        ...result,
      };
    }

    if (intent === "generate-personality") {
      const replies = parseImportedReplies(formData.get("replies"));
      const modelId = String(formData.get("modelId") ?? "");

      if (!replies.length) {
        return {
          ok: false,
          intent,
          message: "Import replies before generating Personality.",
        };
      }

      const { result, creditCharge } = await withCreditCharge(
        session.shop,
        modelId,
        "personality",
        "Generate Brand Voice personality",
        () => generateBrandVoicePersonality({
          modelId,
          replies,
          personality: String(formData.get("personality") ?? ""),
          greeting: String(formData.get("greeting") ?? ""),
          signOff: String(formData.get("signOff") ?? ""),
          alwaysMention: parseStringList(formData.get("alwaysMention")),
          avoidPhrases: parseStringList(formData.get("avoidPhrases")),
          previewReview: String(formData.get("previewReview") ?? ""),
          previewRating: Number(formData.get("previewRating") ?? 5),
          previewProductTitle: String(formData.get("previewProductTitle") ?? ""),
          previewProductType: String(formData.get("previewProductType") ?? ""),
          previewProductTags: parseStringList(formData.get("previewProductTags")),
          personalityStyle: String(formData.get("personalityStyle") ?? ""),
          personalityStrength: String(formData.get("personalityStrength") ?? ""),
          replyLength: String(formData.get("replyLength") ?? ""),
        }),
      );

      return {
        ok: true,
        intent,
        message: `Personality generated with ${result.model.name}. ${creditCharge.amount} credits spent.`,
        personality: result.personality,
        livePreview: result.livePreview,
        aiModel: result.model,
        aiModels: await getAiModelOptions(),
        credits: await getCreditOverview(session.shop),
        creditCharge,
      };
    }

    if (intent === "generate-preview") {
      const modelId = String(formData.get("modelId") ?? "");
      const { result, creditCharge } = await withCreditCharge(
        session.shop,
        modelId,
        "preview",
        "Generate live preview",
        () => generateBrandVoicePreview({
          modelId,
          personality: String(formData.get("personality") ?? ""),
          greeting: String(formData.get("greeting") ?? ""),
          signOff: String(formData.get("signOff") ?? ""),
          alwaysMention: parseStringList(formData.get("alwaysMention")),
          avoidPhrases: parseStringList(formData.get("avoidPhrases")),
          previewReview: String(formData.get("previewReview") ?? ""),
          previewRating: Number(formData.get("previewRating") ?? 5),
          previewProductTitle: String(formData.get("previewProductTitle") ?? ""),
          previewProductType: String(formData.get("previewProductType") ?? ""),
          previewProductTags: parseStringList(formData.get("previewProductTags")),
          personalityStyle: String(formData.get("personalityStyle") ?? ""),
          personalityStrength: String(formData.get("personalityStrength") ?? ""),
          replyLength: String(formData.get("replyLength") ?? ""),
        }),
      );

      return {
        ok: true,
        intent,
        message: `Live preview generated with ${result.model.name}. ${creditCharge.amount} credits spent.`,
        aiModels: await getAiModelOptions(),
        credits: await getCreditOverview(session.shop),
        creditCharge,
        ...result,
      };
    }

  } catch (error) {
    const serialized =
      error instanceof Error && error.name === "JudgeMeApiError"
        ? serializeJudgeMeError(error)
        : error instanceof CreditError
          ? serializeCreditError(error)
        : serializeAiError(error);
    return {
      ok: false,
      intent,
      message: serialized.message,
      error: serialized,
      ...(await loadBrandVoicePageData(session.shop)),
    };
  }

  return {
    ok: false,
    intent,
    message: "Unknown Brand voice action.",
    ...(await loadBrandVoicePageData(session.shop)),
  };
}

export default function BrandVoiceRoute() {
  return <BrandVoicePage />;
}
