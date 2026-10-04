ALTER TABLE "Organization"
ADD COLUMN "logoDataUrl" TEXT,
ADD COLUMN "logoShape" TEXT NOT NULL DEFAULT 'circle',
ADD COLUMN "showNameWithLogo" BOOLEAN NOT NULL DEFAULT false;
