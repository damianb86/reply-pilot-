import { createHmac, timingSafeEqual } from "node:crypto";
import { authenticate } from "./shopify.server";

type ShopifyWebhookContext = Awaited<ReturnType<typeof authenticate.webhook>>;

function webhookSecret() {
  return process.env.SHOPIFY_API_SECRET || "";
}

export async function verifyWebhookHmac(request: Request) {
  const secret = webhookSecret();
  const providedHmac = request.headers.get("x-shopify-hmac-sha256");

  if (!secret || !providedHmac) {
    return false;
  }

  const rawBody = Buffer.from(await request.clone().arrayBuffer());
  const expectedHmac = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const providedBuffer = Buffer.from(providedHmac, "utf8");
  const expectedBuffer = Buffer.from(expectedHmac, "utf8");

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function authenticateWebhook(
  request: Request,
): Promise<ShopifyWebhookContext> {
  if (!(await verifyWebhookHmac(request))) {
    throw new Response("Invalid webhook signature", {
      status: 401,
      statusText: "Unauthorized",
    });
  }

  return authenticate.webhook(request);
}
