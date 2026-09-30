ALTER TABLE "Organization"
ADD COLUMN "slug" TEXT,
ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris';

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

ALTER TABLE "Customer"
ADD COLUMN "email" TEXT;

ALTER TABLE "Appointment"
ADD COLUMN "bookingSource" TEXT NOT NULL DEFAULT 'STAFF';

CREATE TABLE "CustomerEmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerEmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerEmailOtp_organizationId_email_createdAt_idx"
ON "CustomerEmailOtp"("organizationId", "email", "createdAt");

CREATE INDEX "CustomerEmailOtp_expiresAt_idx"
ON "CustomerEmailOtp"("expiresAt");

ALTER TABLE "CustomerEmailOtp"
ADD CONSTRAINT "CustomerEmailOtp_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CustomerPortalRateLimitEvent" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPortalRateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerPortalRateLimitEvent_scope_keyHash_createdAt_idx"
ON "CustomerPortalRateLimitEvent"("scope", "keyHash", "createdAt");

CREATE INDEX "CustomerPortalRateLimitEvent_createdAt_idx"
ON "CustomerPortalRateLimitEvent"("createdAt");
