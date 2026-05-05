CREATE TABLE "ReviewDraft" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'judgeme',
    "sourceReviewId" TEXT NOT NULL,
    "sourceReviewJson" TEXT,
    "customerName" TEXT,
    "customerInitials" TEXT,
    "productTitle" TEXT,
    "reviewBody" TEXT NOT NULL,
    "rating" INTEGER,
    "sourceCreatedAt" TIMESTAMP(3),
    "draft" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "humanRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewDraft_shop_source_sourceReviewId_key" ON "ReviewDraft"("shop", "source", "sourceReviewId");
CREATE INDEX "ReviewDraft_shop_status_sourceCreatedAt_idx" ON "ReviewDraft"("shop", "status", "sourceCreatedAt");
