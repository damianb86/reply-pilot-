import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import SettingsPage from "../../src/pages/SettingsPage";
import { loadBrandVoicePageData } from "../brand-voice.server";
import {
  creditCostForReviewReply,
  productDescriptionCreditMultiplier,
} from "../credits.server";
import {
  cleanupExpiredReviewHistory,
  loadAppSettings,
  saveAppSettings,
  settingsFromFormData,
} from "../settings.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const [settings, brandVoice] = await Promise.all([
    loadAppSettings(session.shop),
    loadBrandVoicePageData(session.shop),
  ]);
  return {
    settings,
    brandVoice,
    productDescriptionCreditMultiplier: productDescriptionCreditMultiplier(true),
    productDescriptionReplyCosts: {
      basic: creditCostForReviewReply("basic", { useProductDescription: true }),
      pro: creditCostForReviewReply("pro", { useProductDescription: true }),
      premium: creditCostForReviewReply("premium", { useProductDescription: true }),
    },
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "save-settings") {
    const settings = await saveAppSettings(session.shop, settingsFromFormData(formData));
    return {
      ok: true,
      intent,
      message: "Settings saved.",
      settings,
    };
  }

  if (intent === "cleanup-retention") {
    const settings = await loadAppSettings(session.shop);
    const result = await cleanupExpiredReviewHistory(session.shop, settings);
    return {
      ok: true,
      intent,
      message: result.deleted
        ? `${result.deleted} expired history item${result.deleted === 1 ? "" : "s"} deleted.`
        : "No expired review history to delete.",
      settings,
      cleanup: result,
    };
  }

  return {
    ok: false,
    intent,
    message: "Unknown settings action.",
    settings: await loadAppSettings(session.shop),
  };
}

export default function SettingsRoute() {
  return <SettingsPage />;
}
