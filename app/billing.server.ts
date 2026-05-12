const SHOP_PLAN_QUERY = `#graphql
  query ShopBillingMode {
    shop {
      plan {
        partnerDevelopment
        publicDisplayName
      }
    }
  }
` as string;

type AdminGraphql = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

function envBillingTestOverride() {
  const value = process.env.SHOPIFY_BILLING_TEST?.trim().toLowerCase();
  if (!value) return null;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return null;
}

export async function shouldUseTestBilling(admin: AdminGraphql) {
  const override = envBillingTestOverride();
  if (override !== null) {
    console.info("[billing] test mode resolved from SHOPIFY_BILLING_TEST", {
      isTest: override,
    });
    return override;
  }
  if (process.env.NODE_ENV !== "production") {
    console.info("[billing] test mode enabled outside production");
    return true;
  }

  try {
    const response = await admin.graphql(SHOP_PLAN_QUERY);
    const json = (await response.json()) as {
      data?: {
        shop?: {
          plan?: {
            partnerDevelopment?: boolean | null;
            publicDisplayName?: string | null;
          } | null;
        } | null;
      };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      throw new Error(json.errors.map((error) => error.message).join("; "));
    }

    const isTest = Boolean(json.data?.shop?.plan?.partnerDevelopment);
    console.info("[billing] test mode resolved from Shopify shop plan", {
      isTest,
      partnerDevelopment: json.data?.shop?.plan?.partnerDevelopment ?? null,
      plan: json.data?.shop?.plan?.publicDisplayName ?? null,
    });
    return isTest;
  } catch {
    console.warn("[billing] could not resolve Shopify shop plan; using live billing mode");
    return false;
  }
}
