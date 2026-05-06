import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import ReviewsPage from "../../src/pages/ReviewsPage";
import {
  approveAndSendDrafts,
  generateDrafts,
  loadReviewsPageData,
  regenerateDrafts,
  reviseDraft,
  restoreDrafts,
  skipDrafts,
  updateDraft,
} from "../reviews.server";
import { serializeAiError } from "../ai.server";
import { CreditError, serializeCreditError } from "../credits.server";
import { serializeJudgeMeError } from "../judgeme.server";
import { authenticate } from "../shopify.server";

function parseIds(formData: FormData) {
  const raw = String(formData.get("ids") ?? "[]");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Fall through to single id.
  }

  const id = String(formData.get("id") ?? "");
  return id ? [id] : [];
}

function formatCreditNumber(value: number) {
  const numeric = Math.trunc(Number(value || 0));
  const sign = numeric < 0 ? "-" : "";
  return `${sign}${Math.abs(numeric).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function generationMessage(
  result: Awaited<ReturnType<typeof generateDrafts>>,
  verb: "generated" | "regenerated" = "generated",
) {
  const infinitive = verb === "generated" ? "generate" : "regenerate";
  const creditText = result.credits.spent
    ? ` ${formatCreditNumber(result.credits.spent)} credits spent.`
    : "";

  if (result.generated && result.failed) {
    return `${result.generated} draft${result.generated === 1 ? "" : "s"} ${verb}, ${result.failed} failed.${creditText}`;
  }

  if (result.failed) {
    return `${result.failed} draft${result.failed === 1 ? "" : "s"} failed to ${infinitive}.`;
  }

  if (!result.generated) {
    return `No drafts needed ${infinitive}.`;
  }

  return `${result.generated} draft${result.generated === 1 ? "" : "s"} ${verb}.${creditText}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  return loadReviewsPageData(session.shop, { sync: true, admin });
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "sync") {
      const data = await loadReviewsPageData(session.shop, { sync: true, admin });
      if (!data.connected) {
        return {
          ok: false,
          intent,
          message: "Connect a review source before refreshing Queue.",
          ...data,
        };
      }

      return { ok: true, intent, message: "Queue refreshed.", ...data };
    }

    if (intent === "regenerate") {
      const ids = parseIds(formData);
      const nudge = String(formData.get("nudge") ?? "");
      const result = await regenerateDrafts(session.shop, ids, nudge || undefined, admin);
      const data = await loadReviewsPageData(session.shop);
      return {
        ok: result.failed === 0,
        intent,
        message: generationMessage(result, "regenerated"),
        error: result.failed ? { message: "Some drafts could not be regenerated.", details: result.errors } : undefined,
        generation: result,
        ...data,
      };
    }

    if (intent === "generate") {
      const ids = parseIds(formData);
      const result = await generateDrafts(session.shop, ids, admin);
      const data = await loadReviewsPageData(session.shop);
      return {
        ok: result.failed === 0,
        intent,
        message: generationMessage(result),
        error: result.failed ? { message: "Some drafts could not be generated.", details: result.errors } : undefined,
        generation: result,
        ...data,
      };
    }

    if (intent === "update-draft") {
      const id = String(formData.get("id") ?? "");
      const draft = String(formData.get("draft") ?? "").trim();
      if (!id || !draft) {
        return {
          ok: false,
          intent,
          message: "Draft text is required.",
          ...(await loadReviewsPageData(session.shop)),
        };
      }

      await updateDraft(session.shop, id, draft);
      return {
        ok: true,
        intent,
        message: "Draft updated.",
        ...(await loadReviewsPageData(session.shop)),
      };
    }

    if (intent === "revise-draft") {
      const id = String(formData.get("id") ?? "");
      const instruction = String(formData.get("instruction") ?? "").trim();
      if (!id || !instruction) {
        return {
          ok: false,
          intent,
          message: "Describe the draft change first.",
          ...(await loadReviewsPageData(session.shop)),
        };
      }

      if (instruction.length > 100) {
        return {
          ok: false,
          intent,
          message: "Draft change instructions must be 100 characters or less.",
          ...(await loadReviewsPageData(session.shop)),
        };
      }

      const result = await reviseDraft(session.shop, id, instruction, admin);
      return {
        ok: Boolean(result),
        intent,
        message: result ? "Draft adjusted." : "Select a pending generated draft first.",
        ...(await loadReviewsPageData(session.shop)),
      };
    }

    if (intent === "skip") {
      const ids = parseIds(formData);
      const count = await skipDrafts(session.shop, ids);
      return {
        ok: true,
        intent,
        message: `${count} review${count === 1 ? "" : "s"} skipped.`,
        ...(await loadReviewsPageData(session.shop)),
      };
    }

    if (intent === "restore") {
      const ids = parseIds(formData);
      const count = await restoreDrafts(session.shop, ids);
      return {
        ok: true,
        intent,
        message: `${count} review${count === 1 ? "" : "s"} restored.`,
        ...(await loadReviewsPageData(session.shop)),
      };
    }

    if (intent === "send") {
      const ids = parseIds(formData);
      const result = await approveAndSendDrafts(session.shop, ids);
      const data = await loadReviewsPageData(session.shop);

      return {
        ok: result.errors.length === 0,
        intent,
        message: result.errors.length
          ? `${result.sent} sent, ${result.errors.length} failed.`
          : `${result.sent} review${result.sent === 1 ? "" : "s"} approved and sent.`,
        error: result.errors.length ? { details: result.errors } : undefined,
        ...data,
      };
    }
  } catch (error) {
    const serialized =
      error instanceof Error && error.name === "AiProviderError"
        ? serializeAiError(error)
        : error instanceof CreditError
          ? serializeCreditError(error)
        : serializeJudgeMeError(error);
    return {
      ok: false,
      intent,
      message: serialized.message,
      error: serialized,
      ...(await loadReviewsPageData(session.shop)),
    };
  }

  return {
    ok: false,
    intent,
    message: "Unknown Queue action.",
    ...(await loadReviewsPageData(session.shop)),
  };
}

export default function ReviewsRoute() {
  return <ReviewsPage />;
}
