CREATE TABLE "AiProviderDailyState" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "currentModelId" TEXT,
    "exhaustedModelsJson" TEXT NOT NULL DEFAULT '[]',
    "lastErrorJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderDailyState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderDailyState_provider_dayKey_key" ON "AiProviderDailyState"("provider", "dayKey");
