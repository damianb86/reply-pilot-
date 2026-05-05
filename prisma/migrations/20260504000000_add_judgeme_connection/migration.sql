CREATE TABLE "JudgeMeConnection" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL,
    "encryptedApiToken" TEXT NOT NULL,
    "tokenMask" TEXT NOT NULL,
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "shopName" TEXT,
    "shopEmail" TEXT,
    "ownerName" TEXT,
    "plan" TEXT,
    "platform" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "widgetVersion" TEXT,
    "awesome" BOOLEAN,
    "reviewCount" INTEGER,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "accountJson" TEXT,
    "settingsJson" TEXT,
    "sampleReviewsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudgeMeConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JudgeMeConnection_shop_key" ON "JudgeMeConnection"("shop");
CREATE INDEX "JudgeMeConnection_shop_status_idx" ON "JudgeMeConnection"("shop", "status");
