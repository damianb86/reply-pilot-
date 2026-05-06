ALTER TABLE "CreditPurchase" ADD COLUMN "bonusCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreditPurchase" ADD COLUMN "totalCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreditPurchase" ADD COLUMN "billingName" TEXT;

UPDATE "CreditPurchase" SET "totalCredits" = "credits" WHERE "totalCredits" = 0;
