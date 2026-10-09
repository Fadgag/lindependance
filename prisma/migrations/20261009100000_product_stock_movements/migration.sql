CREATE TYPE "ProductStockMovementType" AS ENUM ('INITIAL', 'RECEIPT', 'ADJUSTMENT', 'SALE');

ALTER TABLE "Product"
ADD COLUMN "stockMinimum" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ProductStockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "type" "ProductStockMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "note" TEXT,
    "appointmentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductStockMovement_organizationId_productId_createdAt_idx"
ON "ProductStockMovement"("organizationId", "productId", "createdAt");

CREATE INDEX "ProductStockMovement_organizationId_createdAt_idx"
ON "ProductStockMovement"("organizationId", "createdAt");

ALTER TABLE "ProductStockMovement"
ADD CONSTRAINT "ProductStockMovement_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductStockMovement"
ADD CONSTRAINT "ProductStockMovement_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
