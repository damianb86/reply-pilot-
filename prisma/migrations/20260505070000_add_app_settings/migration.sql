CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "settingsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSetting_shop_key" ON "AppSetting"("shop");
