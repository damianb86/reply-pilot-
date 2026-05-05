ALTER TABLE "ReviewDraft" ADD COLUMN "productType" TEXT;
ALTER TABLE "ReviewDraft" ADD COLUMN "productTagsJson" TEXT;

ALTER TABLE "BrandVoiceSetting" ADD COLUMN "previewProductId" TEXT;
ALTER TABLE "BrandVoiceSetting" ADD COLUMN "previewProductTitle" TEXT;
ALTER TABLE "BrandVoiceSetting" ADD COLUMN "previewProductType" TEXT;
ALTER TABLE "BrandVoiceSetting" ADD COLUMN "previewProductTagsJson" TEXT;
ALTER TABLE "BrandVoiceSetting" ADD COLUMN "previewRating" INTEGER NOT NULL DEFAULT 5;
