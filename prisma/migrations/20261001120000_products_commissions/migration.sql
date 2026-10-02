CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

INSERT INTO "products" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'CONSIGNADO', 'Consignado', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "proposals" ADD COLUMN "productId" UUID;
UPDATE "proposals" SET "productId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "proposals" ALTER COLUMN "productId" SET NOT NULL;

CREATE TABLE "partner_product_commissions" (
    "partnerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_product_commissions_pkey" PRIMARY KEY ("partnerId", "productId")
);

INSERT INTO "partner_product_commissions" ("partnerId", "productId", "commissionPercent", "updatedAt")
SELECT "id", '00000000-0000-4000-8000-000000000001', "commissionPercent", CURRENT_TIMESTAMP
FROM "users"
WHERE "role" = 'PARCEIRO';

ALTER TABLE "users" DROP COLUMN "commissionPercent";

CREATE INDEX "proposals_productId_idx" ON "proposals"("productId");

ALTER TABLE "proposals" ADD CONSTRAINT "proposals_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_product_commissions" ADD CONSTRAINT "partner_product_commissions_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_product_commissions" ADD CONSTRAINT "partner_product_commissions_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
