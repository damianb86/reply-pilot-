import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { authenticateWebhook } from "../webhooks.server";

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

function uniqueSearchTerms(payload: unknown) {
  const data = readObject(payload);
  const customer = readObject(data?.customer);
  const rawTerms = [
    readString(customer?.email),
    readString(customer?.phone),
    readString(customer?.id),
    readString(data?.customer_id),
    readString(data?.customer_email),
  ].filter(Boolean);

  return Array.from(
    new Set(rawTerms.flatMap((term) => [term, term.toLowerCase()])),
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticateWebhook(request);
  const data = readObject(payload);
  const shopDomain = readString(data?.shop_domain) || shop;
  const searchTerms = uniqueSearchTerms(payload);

  console.log(`Received ${topic} webhook for ${shopDomain}`);

  if (searchTerms.length > 0) {
    await Promise.all([
      db.reviewDraft.deleteMany({
        where: {
          shop: shopDomain,
          OR: searchTerms.map((term) => ({
            sourceReviewJson: { contains: term },
          })),
        },
      }),
      db.contactRequest.deleteMany({
        where: {
          shop: shopDomain,
          OR: searchTerms.map((term) => ({
            email: { contains: term },
          })),
        },
      }),
      db.session.deleteMany({
        where: {
          shop: shopDomain,
          OR: searchTerms.map((term) => ({
            email: { contains: term },
          })),
        },
      }),
    ]);
  }

  return new Response();
};
