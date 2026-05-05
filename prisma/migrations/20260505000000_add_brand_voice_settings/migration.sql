CREATE TABLE "BrandVoiceSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "signOff" TEXT NOT NULL,
    "alwaysMentionJson" TEXT NOT NULL,
    "avoidPhrasesJson" TEXT NOT NULL,
    "selectedModel" TEXT NOT NULL,
    "livePreview" TEXT,
    "personalityStyle" TEXT NOT NULL DEFAULT 'balanced',
    "personalityStrength" TEXT NOT NULL DEFAULT 'balanced',
    "replyLength" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandVoiceSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandVoiceSetting_shop_key" ON "BrandVoiceSetting"("shop");
