ALTER TABLE "CreditAccount" ALTER COLUMN "startingCredits" TYPE DOUBLE PRECISION USING "startingCredits"::double precision;
ALTER TABLE "CreditAccount" ALTER COLUMN "startingCredits" SET DEFAULT 100.0;
ALTER TABLE "CreditAccount" ALTER COLUMN "purchasedCredits" TYPE DOUBLE PRECISION USING "purchasedCredits"::double precision;
ALTER TABLE "CreditAccount" ALTER COLUMN "purchasedCredits" SET DEFAULT 0.0;
ALTER TABLE "CreditAccount" ALTER COLUMN "bonusCredits" TYPE DOUBLE PRECISION USING "bonusCredits"::double precision;
ALTER TABLE "CreditAccount" ALTER COLUMN "bonusCredits" SET DEFAULT 0.0;
ALTER TABLE "CreditAccount" ALTER COLUMN "spentCredits" TYPE DOUBLE PRECISION USING "spentCredits"::double precision;
ALTER TABLE "CreditAccount" ALTER COLUMN "spentCredits" SET DEFAULT 0.0;
ALTER TABLE "CreditAccount" ALTER COLUMN "refundedCredits" TYPE DOUBLE PRECISION USING "refundedCredits"::double precision;
ALTER TABLE "CreditAccount" ALTER COLUMN "refundedCredits" SET DEFAULT 0.0;
ALTER TABLE "CreditAccount" ALTER COLUMN "balance" TYPE DOUBLE PRECISION USING "balance"::double precision;
ALTER TABLE "CreditAccount" ALTER COLUMN "balance" SET DEFAULT 100.0;

ALTER TABLE "CreditLedgerEntry" ALTER COLUMN "amount" TYPE DOUBLE PRECISION USING "amount"::double precision;
ALTER TABLE "CreditLedgerEntry" ALTER COLUMN "balanceAfter" TYPE DOUBLE PRECISION USING "balanceAfter"::double precision;
