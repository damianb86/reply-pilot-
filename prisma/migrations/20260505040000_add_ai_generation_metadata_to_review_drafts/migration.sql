ALTER TABLE "ReviewDraft" ADD COLUMN "aiModelId" TEXT;
ALTER TABLE "ReviewDraft" ADD COLUMN "aiModelName" TEXT;
ALTER TABLE "ReviewDraft" ADD COLUMN "aiProviderName" TEXT;
ALTER TABLE "ReviewDraft" ADD COLUMN "aiProviderModel" TEXT;
ALTER TABLE "ReviewDraft" ADD COLUMN "draftGeneratedAt" TIMESTAMP(3);
