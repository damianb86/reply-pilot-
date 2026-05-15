import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import DashboardPage from "../../src/pages/DashboardPage";
import {
  disconnectJudgeMe,
  getJudgeMeConnectionView,
  isJudgeMeTestDomainFieldEnabled,
  refreshJudgeMeConnection,
  serializeJudgeMeError,
  upsertJudgeMeConnection,
} from "../judgeme.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";

  return {
    shop: session.shop,
    appHandle: process.env.SHOPIFY_APP_HANDLE || "reply-pilot",
    connection: await getJudgeMeConnectionView(session.shop),
    judgeMeApiSettingsUrl: "https://judge.me/settings?jump_to=judge.me+api",
    judgeMeApiDocsUrl: "https://judge.me/help/en/articles/8409180-judge-me-api",
    isDevelopment: appEnv !== "production",
    showJudgeMeTestDomainField: isJudgeMeTestDomainFieldEnabled(),
    appEnv,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "connect-token") {
    const apiToken = String(formData.get("apiToken") ?? "").trim();
    const submittedShopDomain = String(formData.get("shopDomain") ?? "").trim();
    const shopDomain =
      isJudgeMeTestDomainFieldEnabled() && submittedShopDomain
        ? submittedShopDomain
        : session.shop;

    if (!apiToken) {
      return {
        ok: false,
        intent,
        message: "Judge.me private API token is required.",
      };
    }

    try {
      await upsertJudgeMeConnection({
        shop: session.shop,
        shopDomain,
        apiToken,
        authMethod: "private_token",
      });

      return {
        ok: true,
        intent,
        message: "Judge.me connected successfully.",
        connection: await getJudgeMeConnectionView(session.shop),
      };
    } catch (error) {
      const serialized = serializeJudgeMeError(error);
      return {
        ok: false,
        intent,
        message: serialized.message,
        error: serialized,
      };
    }
  }

  if (intent === "refresh") {
    try {
      await refreshJudgeMeConnection(session.shop);

      return {
        ok: true,
        intent,
        message: "Judge.me connection refreshed.",
        connection: await getJudgeMeConnectionView(session.shop),
      };
    } catch (error) {
      const serialized = serializeJudgeMeError(error);
      return {
        ok: false,
        intent,
        message: serialized.message,
        error: serialized,
        connection: await getJudgeMeConnectionView(session.shop),
      };
    }
  }

  if (intent === "disconnect") {
    await disconnectJudgeMe(session.shop);
    return {
      ok: true,
      intent,
      message: "Judge.me disconnected.",
      connection: null,
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
