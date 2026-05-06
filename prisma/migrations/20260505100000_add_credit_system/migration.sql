CREATE TABLE "CreditAccount" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "startingCredits" INTEGER NOT NULL DEFAULT 100,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "spentCredits" INTEGER NOT NULL DEFAULT 0,
    "refundedCredits" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditPurchase" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shopifyPurchaseId" TEXT,
    "confirmationUrl" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditAccount_shop_key" ON "CreditAccount"("shop");
CREATE INDEX "CreditLedgerEntry_shop_createdAt_idx" ON "CreditLedgerEntry"("shop", "createdAt");
CREATE INDEX "CreditLedgerEntry_shop_referenceType_referenceId_idx" ON "CreditLedgerEntry"("shop", "referenceType", "referenceId");
CREATE UNIQUE INDEX "CreditPurchase_shopifyPurchaseId_key" ON "CreditPurchase"("shopifyPurchaseId");
CREATE INDEX "CreditPurchase_shop_status_idx" ON "CreditPurchase"("shop", "status");
CREATE INDEX "CreditPurchase_shop_createdAt_idx" ON "CreditPurchase"("shop", "createdAt");
