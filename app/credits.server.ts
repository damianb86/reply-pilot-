import db from "./db.server";

type AdminGraphql = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

type CreditOperation = "reply" | "preview" | "personality";

const INITIAL_FREE_CREDITS = 100;
const CREDIT_MULTIPLIERS: Record<string, number> = {
  dev: 0,
  basic: 1,
  pro: 4,
  premium: 12,
};
const OPERATION_BASE_COSTS: Record<CreditOperation, number> = {
  reply: 1,
  preview: 1,
  personality: 2,
};

export const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 1000,
    amountCents: 500,
    currencyCode: "USD",
    description: "A light top-up for setup, previews, and small review batches.",
  },
  {
    id: "growth",
    name: "Growth",
    credits: 3500,
    amountCents: 1500,
    currencyCode: "USD",
    description: "A practical pack for regular Queue work and weekly review batches.",
    recommended: true,
  },
  {
    id: "scale",
    name: "Scale",
    credits: 10000,
    amountCents: 3900,
    currencyCode: "USD",
    description: "Lower effective cost for stores with high review volume.",
  },
  {
    id: "business",
    name: "Business",
    credits: 30000,
    amountCents: 9900,
    currencyCode: "USD",
    description: "Best value for busy stores using Pro or Premium heavily.",
  },
];

const APP_PURCHASE_CREATE = `#graphql
  mutation AppCreditPurchaseCreate($name: String!, $returnUrl: URL!, $price: MoneyInput!, $test: Boolean) {
    appPurchaseOneTimeCreate(name: $name, returnUrl: $returnUrl, price: $price, test: $test) {
      confirmationUrl
      userErrors {
        field
        message
      }
      appPurchaseOneTime {
        id
        status
      }
    }
  }
`;

const APP_PURCHASE_STATUS = `#graphql
  query AppCreditPurchaseStatus($id: ID!) {
    node(id: $id) {
      ... on AppPurchaseOneTime {
        id
        status
      }
    }
  }
`;

export class CreditError extends Error {
  required?: number;
  balance?: number;
  shortfall?: number;

  constructor(message: string, details: { required?: number; balance?: number } = {}) {
    super(message);
    this.name = "CreditError";
    this.required = details.required;
    this.balance = details.balance;
    this.shortfall =
      details.required !== undefined && details.balance !== undefined
        ? Math.max(0, details.required - details.balance)
        : undefined;
  }
}

function resolveCreditModelId(modelId?: string | null) {
  if (modelId === "gemini-3-flash-preview") return "dev";
  if (modelId === "openai-gpt-5-4-mini") return "pro";
  return modelId && CREDIT_MULTIPLIERS[modelId] !== undefined ? modelId : "basic";
}

export function creditMultiplierForModel(modelId?: string | null) {
  return CREDIT_MULTIPLIERS[resolveCreditModelId(modelId)] ?? CREDIT_MULTIPLIERS.basic;
}

export function creditCostForOperation(modelId: string | null | undefined, operation: CreditOperation) {
  return OPERATION_BASE_COSTS[operation] * creditMultiplierForModel(modelId);
}

export function creditCostsForModel(modelId?: string | null) {
  return {
    multiplier: creditMultiplierForModel(modelId),
    reply: creditCostForOperation(modelId, "reply"),
    preview: creditCostForOperation(modelId, "preview"),
    personality: creditCostForOperation(modelId, "personality"),
  };
}

function formatCurrency(amountCents: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function packageView(pkg: (typeof CREDIT_PACKAGES)[number]) {
  return {
    ...pkg,
    price: pkg.amountCents / 100,
    priceLabel: formatCurrency(pkg.amountCents, pkg.currencyCode),
  };
}

async function accountForShop(shop: string, tx: typeof db = db) {
  const existing = await tx.creditAccount.findUnique({ where: { shop } });
  if (existing) return existing;

  try {
    return await tx.$transaction(async (transaction) => {
      const account = await transaction.creditAccount.create({
        data: {
          shop,
          startingCredits: INITIAL_FREE_CREDITS,
          balance: INITIAL_FREE_CREDITS,
        },
      });
      await transaction.creditLedgerEntry.create({
        data: {
          shop,
          type: "grant",
          amount: INITIAL_FREE_CREDITS,
          balanceAfter: INITIAL_FREE_CREDITS,
          description: "Welcome credits",
          referenceType: "initial",
          referenceId: shop,
        },
      });
      return account;
    });
  } catch {
    const account = await tx.creditAccount.findUnique({ where: { shop } });
    if (account) return account;
    throw new CreditError("Could not initialize credits for this shop.");
  }
}

export async function getCreditOverview(shop: string) {
  const account = await accountForShop(shop);
  const totalAllocated = account.startingCredits + account.purchasedCredits + account.refundedCredits;
  return {
    balance: account.balance,
    spent: account.spentCredits,
    purchased: account.purchasedCredits,
    granted: account.startingCredits,
    refunded: account.refundedCredits,
    totalAllocated,
    usedPercent: totalAllocated > 0 ? Math.min(100, Math.round((account.spentCredits / totalAllocated) * 100)) : 0,
    packages: CREDIT_PACKAGES.map(packageView),
    modelCosts: {
      dev: creditCostsForModel("dev"),
      basic: creditCostsForModel("basic"),
      pro: creditCostsForModel("pro"),
      premium: creditCostsForModel("premium"),
    },
  };
}

export async function spendCredits(
  shop: string,
  amount: number,
  input: {
    description: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const credits = Math.max(0, Math.round(amount));
  const account = await accountForShop(shop);
  if (!credits) return { id: null, amount: 0, balanceAfter: account.balance };

  return db.$transaction(async (tx) => {
    const updated = await tx.creditAccount.updateMany({
      where: { shop, balance: { gte: credits } },
      data: {
        balance: { decrement: credits },
        spentCredits: { increment: credits },
      },
    });

    if (updated.count !== 1) {
      const latest = await tx.creditAccount.findUnique({ where: { shop } });
      throw new CreditError(
        `Not enough credits. ${credits} credits required, ${latest?.balance ?? 0} available.`,
        { required: credits, balance: latest?.balance ?? 0 },
      );
    }

    const latest = await tx.creditAccount.findUniqueOrThrow({ where: { shop } });
    const entry = await tx.creditLedgerEntry.create({
      data: {
        shop,
        type: "spend",
        amount: -credits,
        balanceAfter: latest.balance,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });

    return { id: entry.id, amount: credits, balanceAfter: latest.balance };
  });
}

export async function refundCredits(
  shop: string,
  amount: number,
  input: {
    description: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const credits = Math.max(0, Math.round(amount));
  if (!credits) return getCreditOverview(shop);
  await accountForShop(shop);

  await db.$transaction(async (tx) => {
    const account = await tx.creditAccount.update({
      where: { shop },
      data: {
        balance: { increment: credits },
        refundedCredits: { increment: credits },
      },
    });

    await tx.creditLedgerEntry.create({
      data: {
        shop,
        type: "refund",
        amount: credits,
        balanceAfter: account.balance,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  });

  return getCreditOverview(shop);
}

async function grantPurchasedCredits(shop: string, purchaseId: string, credits: number) {
  await accountForShop(shop);

  await db.$transaction(async (tx) => {
    const updatedPurchase = await tx.creditPurchase.updateMany({
      where: { id: purchaseId, shop, status: { not: "credited" } },
      data: { status: "credited", lastError: null },
    });

    if (updatedPurchase.count !== 1) return;

    const account = await tx.creditAccount.update({
      where: { shop },
      data: {
        balance: { increment: credits },
        purchasedCredits: { increment: credits },
      },
    });

    await tx.creditLedgerEntry.create({
      data: {
        shop,
        type: "purchase",
        amount: credits,
        balanceAfter: account.balance,
        description: "Purchased credits",
        referenceType: "credit_purchase",
        referenceId: purchaseId,
      },
    });
  });
}

function billingIsTest() {
  if (process.env.SHOPIFY_BILLING_TEST === "false") return false;
  return (process.env.APP_ENV || process.env.NODE_ENV || "development") !== "production";
}

async function readGraphql(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readPackage(packageId: string) {
  const pkg = CREDIT_PACKAGES.find((candidate) => candidate.id === packageId);
  if (!pkg) throw new CreditError("Select a valid credit package.");
  return pkg;
}

export async function createCreditPurchase(
  shop: string,
  packageId: string,
  admin: AdminGraphql,
  returnUrl: string,
) {
  const pkg = readPackage(packageId);
  const purchase = await db.creditPurchase.create({
    data: {
      shop,
      packageId: pkg.id,
      credits: pkg.credits,
      amountCents: pkg.amountCents,
      currencyCode: pkg.currencyCode,
      status: "pending",
    },
  });
  const callbackUrl = new URL(returnUrl);
  callbackUrl.searchParams.set("credit_purchase", purchase.id);

  try {
    const response = await admin.graphql(APP_PURCHASE_CREATE, {
      variables: {
        name: `Reply Pilot ${pkg.credits} credits`,
        returnUrl: callbackUrl.toString(),
        price: {
          amount: pkg.amountCents / 100,
          currencyCode: pkg.currencyCode,
        },
        test: billingIsTest(),
      },
    });
    const body = await readGraphql(response);
    const payload = readObject(readObject(body.data).appPurchaseOneTimeCreate);
    const userErrors = Array.isArray(payload.userErrors) ? payload.userErrors : [];

    if (userErrors.length) {
      const message = userErrors
        .map((error) => readObject(error).message)
        .filter(Boolean)
        .join(", ");
      throw new CreditError(message || "Shopify could not create the credit purchase.");
    }

    const appPurchase = readObject(payload.appPurchaseOneTime);
    const confirmationUrl = String(payload.confirmationUrl || "");
    const shopifyPurchaseId = String(appPurchase.id || "");
    if (!confirmationUrl || !shopifyPurchaseId) {
      throw new CreditError("Shopify did not return a confirmation URL for this credit purchase.");
    }

    await db.creditPurchase.update({
      where: { id: purchase.id },
      data: {
        shopifyPurchaseId,
        confirmationUrl,
        status: String(appPurchase.status || "pending").toLowerCase(),
      },
    });

    return { confirmationUrl, purchaseId: purchase.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create credit purchase.";
    await db.creditPurchase.update({
      where: { id: purchase.id },
      data: { status: "failed", lastError: message },
    });
    throw error;
  }
}

export async function finalizeCreditPurchase(shop: string, purchaseId: string, admin: AdminGraphql) {
  const purchase = await db.creditPurchase.findFirst({ where: { id: purchaseId, shop } });
  if (!purchase) {
    return { ok: false, message: "Credit purchase was not found." };
  }

  if (purchase.status === "credited") {
    return { ok: true, message: `${purchase.credits} credits were already added.` };
  }

  if (!purchase.shopifyPurchaseId) {
    return { ok: false, message: "Credit purchase is missing Shopify confirmation data." };
  }

  const response = await admin.graphql(APP_PURCHASE_STATUS, {
    variables: { id: purchase.shopifyPurchaseId },
  });
  const body = await readGraphql(response);
  const node = readObject(readObject(body.data).node);
  const status = String(node.status || "").toLowerCase();

  if (status === "active") {
    await grantPurchasedCredits(shop, purchase.id, purchase.credits);
    return { ok: true, message: `${purchase.credits} credits added to your shop.` };
  }

  await db.creditPurchase.update({
    where: { id: purchase.id },
    data: {
      status: status || "pending",
      lastError: status && status !== "pending" ? `Shopify purchase status: ${status}` : null,
    },
  });

  return {
    ok: false,
    message:
      status === "pending"
        ? "Credit purchase is still pending approval."
        : "Credit purchase was not approved.",
  };
}

export async function loadCreditPageData(shop: string) {
  const [credits, recentPurchases, recentLedger] = await Promise.all([
    getCreditOverview(shop),
    db.creditPurchase.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.creditLedgerEntry.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    credits,
    recentPurchases: recentPurchases.map((purchase) => ({
      id: purchase.id,
      packageId: purchase.packageId,
      credits: purchase.credits,
      priceLabel: formatCurrency(purchase.amountCents, purchase.currencyCode),
      status: purchase.status,
      createdAt: purchase.createdAt.toISOString(),
    })),
    recentLedger: recentLedger.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: entry.amount,
      balanceAfter: entry.balanceAfter,
      description: entry.description,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export function serializeCreditError(error: unknown) {
  if (error instanceof CreditError) {
    return {
      message: error.message,
      required: error.required,
      balance: error.balance,
      shortfall: error.shortfall,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.stack,
    };
  }

  return {
    message: "Unknown credit error.",
    details: error,
  };
}
