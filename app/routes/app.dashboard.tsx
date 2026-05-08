import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import DashboardPage from "../../src/pages/DashboardPage";
import {
  connectReviewProvider,
  disconnectReviewProvider,
  getReviewProviderConnectionViews,
  refreshReviewProvider,
  serializeReviewProviderError,
} from "../review-providers.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";

  return {
    shop: session.shop,
    appHandle: process.env.SHOPIFY_APP_HANDLE || "reply-pilot",
    connections: await getReviewProviderConnectionViews(session.shop),
    judgeMeApiSettingsUrl: "https://judge.me/settings?jump_to=judge.me+api",
    judgeMeApiDocsUrl: "https://judge.me/help/en/articles/8409180-judge-me-api",
    yotpoApiSettingsUrl: "https://support.yotpo.com/docs/finding-your-yotpo-app-key-and-secret-key",
    yotpoApiDocsUrl: "https://apidocs.yotpo.com/reference/retrieve-all-reviews",
    yotpoCommentDocsUrl: "https://develop.yotpo.com/reference/comment-on-a-review",
    isDevelopment: appEnv !== "production",
    appEnv,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "connect-token") {
    const provider = String(formData.get("provider") || "judgeme").trim() || "judgeme";
    const apiToken = String(formData.get("apiToken") ?? "").trim();
    const shopDomain = String(formData.get("shopDomain") || session.shop).trim();
    const storeId = String(formData.get("storeId") ?? "").trim();
    const apiSecret = String(formData.get("apiSecret") ?? "").trim();
    const developerAccessToken = String(formData.get("developerAccessToken") ?? "").trim();

    if (provider === "yotpo" && (!storeId || !apiSecret || !developerAccessToken)) {
      return {
        ok: false,
        intent,
        provider,
        message: "Yotpo Store ID, API secret, and App Developer API access token are required.",
      };
    }

    if (provider !== "yotpo" && !apiToken) {
      return {
        ok: false,
        intent,
        provider,
        message: "Judge.me private API token is required.",
      };
    }

    try {
      await connectReviewProvider({
        provider,
        shop: session.shop,
        shopDomain,
        apiToken,
        storeId,
        apiSecret,
        developerAccessToken,
      });

      return {
        ok: true,
        intent,
        provider,
        message: provider === "yotpo" ? "Yotpo connected successfully." : "Judge.me connected successfully.",
        connections: await getReviewProviderConnectionViews(session.shop),
      };
    } catch (error) {
      const serialized = serializeReviewProviderError(error);
      return {
        ok: false,
        intent,
        provider,
        message: serialized.message,
        error: serialized,
      };
    }
  }

  if (intent === "refresh") {
    const provider = String(formData.get("provider") || "judgeme").trim() || "judgeme";
    try {
      await refreshReviewProvider(session.shop, provider);

      return {
        ok: true,
        intent,
        provider,
        message: provider === "yotpo" ? "Yotpo connection refreshed." : "Judge.me connection refreshed.",
        connections: await getReviewProviderConnectionViews(session.shop),
      };
    } catch (error) {
      const serialized = serializeReviewProviderError(error);
      return {
        ok: false,
        intent,
        provider,
        message: serialized.message,
        error: serialized,
        connections: await getReviewProviderConnectionViews(session.shop),
      };
    }
  }

  if (intent === "disconnect") {
    const provider = String(formData.get("provider") || "judgeme").trim() || "judgeme";
    await disconnectReviewProvider(session.shop, provider);
    return {
      ok: true,
      intent,
      provider,
      message: provider === "yotpo" ? "Yotpo disconnected." : "Judge.me disconnected.",
      connections: await getReviewProviderConnectionViews(session.shop),
    };
  }

  return {
    ok: false,
    intent,
    message: "Unknown Connect action.",
  };
}

export default function DashboardRoute() {
  return <DashboardPage />;
}
