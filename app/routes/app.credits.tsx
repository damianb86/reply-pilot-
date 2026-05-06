import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import CreditsPage from "../../src/pages/CreditsPage";
import {
  createCreditPurchase,
  finalizeCreditPurchase,
  loadCreditPageData,
  serializeCreditError,
} from "../credits.server";
import { authenticate } from "../shopify.server";

function returnUrlForRequest(request: Request) {
  const url = new URL(request.url);
  const returnUrl = new URL("/app/credits", url.origin);

  for (const key of ["embedded", "host", "shop"]) {
    const value = url.searchParams.get(key);
    if (value) returnUrl.searchParams.set(key, value);
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
      result = await finalizeCreditPurchase(session.shop, purchaseId, admin);
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
