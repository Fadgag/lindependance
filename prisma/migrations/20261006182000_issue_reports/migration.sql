CREATE TABLE "IssueReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "reporterType" TEXT NOT NULL,
    "reporterName" TEXT,
    "reporterEmail" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "IssueReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IssueReport_status_createdAt_idx" ON "IssueReport"("status", "createdAt");
CREATE INDEX "IssueReport_organizationId_createdAt_idx" ON "IssueReport"("organizationId", "createdAt");
CREATE INDEX "IssueReport_resolvedAt_idx" ON "IssueReport"("resolvedAt");

ALTER TABLE "IssueReport"
ADD CONSTRAINT "IssueReport_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
