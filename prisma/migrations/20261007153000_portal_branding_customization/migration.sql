ALTER TABLE "Organization"
ADD COLUMN "portalNameFont" TEXT NOT NULL DEFAULT 'manrope',
ADD COLUMN "portalNameSize" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN "portalNameColor" TEXT NOT NULL DEFAULT 'charcoal',
ADD COLUMN "portalNameWeight" TEXT NOT NULL DEFAULT 'semibold',
ADD COLUMN "portalNameAlignment" TEXT NOT NULL DEFAULT 'left',
ADD COLUMN "portalLogoSize" INTEGER NOT NULL DEFAULT 48;
