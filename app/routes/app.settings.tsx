import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import SettingsPage from "../../src/pages/SettingsPage";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "verify-judgeme") {
    const apiToken = ((formData.get("apiToken") as string) ?? "").trim();

    if (!apiToken) {
      return { success: false, error: "API token is required." };
    }

    try {
      const url = new URL("https://judge.me/api/v1/reviews");
      url.searchParams.set("api_token", apiToken);
      url.searchParams.set("shop_domain", session.shop);
      url.searchParams.set("per_page", "1");

      const response = await fetch(url.toString());

      if (response.ok) {
        return { success: true, shop: session.shop };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: "Invalid API token. Please check your Judge.me credentials.",
        };
      } else {
        return {
          success: false,
          error: `Connection check failed (${response.status}). Please try again.`,
        };
      }
    } catch {
      return {
        success: false,
        error: "Could not reach Judge.me. Check your internet connection.",
      };
    }
  }

  return { success: false, error: "Unknown action." };
}

export default function SettingsRoute() {
  return <SettingsPage />;
}
