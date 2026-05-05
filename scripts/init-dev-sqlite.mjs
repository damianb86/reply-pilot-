import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addColumnIfMissing(tableName, columnName, definition) {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
  if (columns.some((column) => column.name === columnName)) return;

  await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
}

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "ContactRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
  )
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "ContactRequest_shop_createdAt_idx"
  ON "ContactRequest"("shop", "createdAt")
`);

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "JudgeMeConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL UNIQUE,
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
    "lastVerifiedAt" DATETIME,
    "lastError" TEXT,
    "accountJson" TEXT,
    "settingsJson" TEXT,
    "sampleReviewsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "JudgeMeConnection_shop_status_idx"
  ON "JudgeMeConnection"("shop", "status")
`);

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "ReviewDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'judgeme',
    "sourceReviewId" TEXT NOT NULL,
    "sourceReviewJson" TEXT,
    "customerName" TEXT,
    "customerInitials" TEXT,
    "productTitle" TEXT,
    "productType" TEXT,
    "productTagsJson" TEXT,
    "reviewBody" TEXT NOT NULL,
    "rating" INTEGER,
    "sourceCreatedAt" DATETIME,
    "draft" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "aiModelId" TEXT,
    "aiModelName" TEXT,
    "aiProviderName" TEXT,
    "aiProviderModel" TEXT,
    "draftGeneratedAt" DATETIME,
    "humanRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "skippedAt" DATETIME,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

await prisma.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "ReviewDraft_shop_source_sourceReviewId_key"
  ON "ReviewDraft"("shop", "source", "sourceReviewId")
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "ReviewDraft_shop_status_sourceCreatedAt_idx"
  ON "ReviewDraft"("shop", "status", "sourceCreatedAt")
`);

await addColumnIfMissing("ReviewDraft", "productType", "TEXT");
await addColumnIfMissing("ReviewDraft", "productTagsJson", "TEXT");
await addColumnIfMissing("ReviewDraft", "aiModelId", "TEXT");
await addColumnIfMissing("ReviewDraft", "aiModelName", "TEXT");
await addColumnIfMissing("ReviewDraft", "aiProviderName", "TEXT");
await addColumnIfMissing("ReviewDraft", "aiProviderModel", "TEXT");
await addColumnIfMissing("ReviewDraft", "draftGeneratedAt", "DATETIME");

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "BrandVoiceSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL UNIQUE,
    "personality" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "signOff" TEXT NOT NULL,
    "alwaysMentionJson" TEXT NOT NULL,
    "avoidPhrasesJson" TEXT NOT NULL,
    "selectedModel" TEXT NOT NULL,
    "livePreview" TEXT,
    "previewReview" TEXT,
    "previewProductId" TEXT,
    "previewProductTitle" TEXT,
    "previewProductType" TEXT,
    "previewProductTagsJson" TEXT,
    "previewRating" INTEGER NOT NULL DEFAULT 5,
    "personalityStyle" TEXT NOT NULL DEFAULT 'balanced',
    "personalityStrength" TEXT NOT NULL DEFAULT 'balanced',
    "replyLength" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

await addColumnIfMissing("BrandVoiceSetting", "personalityStyle", "TEXT NOT NULL DEFAULT 'balanced'");
await addColumnIfMissing("BrandVoiceSetting", "personalityStrength", "TEXT NOT NULL DEFAULT 'balanced'");
await addColumnIfMissing("BrandVoiceSetting", "replyLength", "TEXT NOT NULL DEFAULT 'medium'");
await addColumnIfMissing("BrandVoiceSetting", "previewReview", "TEXT");
await addColumnIfMissing("BrandVoiceSetting", "previewProductId", "TEXT");
await addColumnIfMissing("BrandVoiceSetting", "previewProductTitle", "TEXT");
await addColumnIfMissing("BrandVoiceSetting", "previewProductType", "TEXT");
await addColumnIfMissing("BrandVoiceSetting", "previewProductTagsJson", "TEXT");
await addColumnIfMissing("BrandVoiceSetting", "previewRating", "INTEGER NOT NULL DEFAULT 5");

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "AiProviderDailyState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "currentModelId" TEXT,
    "exhaustedModelsJson" TEXT NOT NULL DEFAULT '[]',
    "lastErrorJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

await prisma.$executeRawUnsafe(`
  CREATE UNIQUE INDEX IF NOT EXISTS "AiProviderDailyState_provider_dayKey_key"
  ON "AiProviderDailyState"("provider", "dayKey")
`);

await prisma.$disconnect();
