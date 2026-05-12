import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import CreditsPage from "../../src/pages/CreditsPage";
import {
  createCreditPurchase,
  finalizeCreditPurchase,
  loadCreditPageData,
  serializeCreditError,
} from "../credits.server";
import { authenticate } from "../shopify.server";

function shopAdminHandle(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "");
}

function returnUrlForRequest(request: Request) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const apiKey = process.env.SHOPIFY_API_KEY;

  if (apiKey && shop) {
    return `https://admin.shopify.com/store/${shopAdminHandle(shop)}/apps/${apiKey}/app/credits`;
  }

  const returnUrl = new URL("/app/credits", url.origin);

  for (const key of ["embedded", "host", "shop"]) {
    const value = url.searchParams.get(key);
    if (value) returnUrl.searchParams.set(key, value);
  }

  if (shop && !returnUrl.searchParams.get("host")) {
    returnUrl.searchParams.set(
      "host",
      Buffer.from(`admin.shopify.com/store/${shopAdminHandle(shop)}`).toString("base64"),
    );
  }

  return returnUrl.toString();
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const purchaseId = url.searchParams.get("credit_purchase");
  let result: Awaited<ReturnType<typeof finalizeCreditPurchase>> | null = null;

  if (purchaseId) {
    try {
      result = await finalizeCreditPurchase(session.shop, purchaseId, admin, {
        chargeId: url.searchParams.get("charge_id"),
        settleApproval: !url.pathname.endsWith(".data"),
      });
    } catch (error) {
      const serialized = serializeCreditError(error);
      result = { ok: false, message: serialized.message };
    }
  }

  return {
    ...(await loadCreditPageData(session.shop)),
    ok: result?.ok,
    message: result?.message,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const packageId = String(formData.get("packageId") ?? "");

  try {
    const purchase = await createCreditPurchase(
      session.shop,
      packageId,
      admin,
      returnUrlForRequest(request),
    );

    return {
      ...(await loadCreditPageData(session.shop)),
      ok: true,
      message: "Opening Shopify billing approval...",
      confirmationUrl: purchase.confirmationUrl,
    };
  } catch (error) {
    const serialized = serializeCreditError(error);
    return {
      ...(await loadCreditPageData(session.shop)),
      ok: false,
      message: serialized.message,
      error: serialized,
    };
  }
}

export default function CreditsRoute() {
  return <CreditsPage />;
}
