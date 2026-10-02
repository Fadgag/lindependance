CREATE TABLE "TestCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "build" TEXT NOT NULL,
    "profiles" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "publicToken" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TestCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestFeedback" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "scenarioTitle" TEXT NOT NULL,
    "scenarioPriority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "environment" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestCampaign_publicToken_key" ON "TestCampaign"("publicToken");
CREATE INDEX "TestCampaign_organizationId_status_createdAt_idx"
ON "TestCampaign"("organizationId", "status", "createdAt");
CREATE INDEX "TestFeedback_campaignId_profile_scenarioId_createdAt_idx"
ON "TestFeedback"("campaignId", "profile", "scenarioId", "createdAt");
CREATE INDEX "TestFeedback_organizationId_createdAt_idx"
ON "TestFeedback"("organizationId", "createdAt");

ALTER TABLE "TestCampaign"
ADD CONSTRAINT "TestCampaign_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestFeedback"
ADD CONSTRAINT "TestFeedback_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "TestCampaign"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestFeedback"
ADD CONSTRAINT "TestFeedback_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
