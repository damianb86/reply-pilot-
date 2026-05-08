CREATE TABLE "ReviewProviderConnection" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "providerShopDomain" TEXT,
    "authMethod" TEXT NOT NULL,
    "encryptedCredentialsJson" TEXT NOT NULL,
    "credentialMaskJson" TEXT NOT NULL,
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "displayName" TEXT,
    "reviewCount" INTEGER,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "accountJson" TEXT,
    "settingsJson" TEXT,
    "sampleReviewsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewProviderConnection_shop_provider_key" ON "ReviewProviderConnection"("shop", "provider");
CREATE INDEX "ReviewProviderConnection_shop_status_idx" ON "ReviewProviderConnection"("shop", "status");
CREATE INDEX "ReviewProviderConnection_shop_provider_status_idx" ON "ReviewProviderConnection"("shop", "provider", "status");
