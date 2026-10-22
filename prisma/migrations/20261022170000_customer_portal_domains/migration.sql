CREATE TABLE "CustomerPortalDomain" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPortalDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPortalDomain_hostname_key"
ON "CustomerPortalDomain"("hostname");
CREATE INDEX "CustomerPortalDomain_organizationId_idx"
ON "CustomerPortalDomain"("organizationId");

ALTER TABLE "CustomerPortalDomain"
ADD CONSTRAINT "CustomerPortalDomain_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
