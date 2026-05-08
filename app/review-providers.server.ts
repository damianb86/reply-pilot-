import {
  disconnectJudgeMe,
  getJudgeMeConnectionView,
  refreshJudgeMeConnection,
  serializeJudgeMeError,
  upsertJudgeMeConnection,
} from "./judgeme.server";
import {
  disconnectYotpo,
  getYotpoConnectionView,
  refreshYotpoConnection,
  serializeYotpoError,
  upsertYotpoConnection,
} from "./yotpo.server";

export type ReviewProviderId = "judgeme" | "yotpo";

export const REVIEW_PROVIDERS: Record<ReviewProviderId, {
  id: ReviewProviderId;
  name: string;
  logo: string;
}> = {
  judgeme: {
    id: "judgeme",
    name: "Judge.me",
    logo: "/provider-logos/judgeme.png",
  },
  yotpo: {
    id: "yotpo",
    name: "Yotpo",
    logo: "/provider-logos/yotpo.svg",
  },
};

export function reviewProviderMetadata(provider: string | null | undefined) {
  if (provider === "yotpo") return REVIEW_PROVIDERS.yotpo;
  return REVIEW_PROVIDERS.judgeme;
}

function normalizeJudgeMeView(connection: Awaited<ReturnType<typeof getJudgeMeConnectionView>>) {
  if (!connection) return null;
  return {
    ...connection,
    provider: "judgeme" as const,
    providerName: REVIEW_PROVIDERS.judgeme.name,
    providerLogo: REVIEW_PROVIDERS.judgeme.logo,
    providerAccountId: connection.shopDomain,
    credentialMasks: { apiToken: connection.tokenMask },
  };
}

export async function getReviewProviderConnectionViews(shop: string) {
  const [judgeMe, yotpo] = await Promise.all([
    getJudgeMeConnectionView(shop),
    getYotpoConnectionView(shop),
  ]);

  return [
    normalizeJudgeMeView(judgeMe),
    yotpo,
  ].filter((connection): connection is NonNullable<typeof connection> => Boolean(connection));
}

export async function getActiveReviewProviderViews(shop: string) {
  const connections = await getReviewProviderConnectionViews(shop);
  return connections.filter((connection) => connection.status === "connected");
}

export async function connectReviewProvider(input: {
  provider: string;
  shop: string;
  shopDomain?: string;
  apiToken?: string;
  storeId?: string;
  apiSecret?: string;
  developerAccessToken?: string;
}) {
  if (input.provider === "yotpo") {
    return upsertYotpoConnection({
      shop: input.shop,
      storeId: input.storeId || "",
      apiSecret: input.apiSecret || "",
      developerAccessToken: input.developerAccessToken || null,
    });
  }

  return upsertJudgeMeConnection({
    shop: input.shop,
    shopDomain: input.shopDomain || input.shop,
    apiToken: input.apiToken || "",
    authMethod: "private_token",
  });
}

export async function refreshReviewProvider(shop: string, provider: string) {
  if (provider === "yotpo") return refreshYotpoConnection(shop);
  return refreshJudgeMeConnection(shop);
}

export async function disconnectReviewProvider(shop: string, provider: string) {
  if (provider === "yotpo") return disconnectYotpo(shop);
  return disconnectJudgeMe(shop);
}

export function serializeReviewProviderError(error: unknown) {
  if (error instanceof Error && error.name === "YotpoApiError") {
    return serializeYotpoError(error);
  }

  return serializeJudgeMeError(error);
}
