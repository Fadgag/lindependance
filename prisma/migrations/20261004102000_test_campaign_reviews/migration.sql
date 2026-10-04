CREATE TABLE "TestCampaignReview" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "clarity" TEXT,
    "duration" TEXT,
    "links" TEXT,
    "satisfaction" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCampaignReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TestCampaignReview_campaignId_createdAt_idx"
ON "TestCampaignReview"("campaignId", "createdAt");
CREATE INDEX "TestCampaignReview_organizationId_createdAt_idx"
ON "TestCampaignReview"("organizationId", "createdAt");

ALTER TABLE "TestCampaignReview"
ADD CONSTRAINT "TestCampaignReview_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "TestCampaign"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestCampaignReview"
ADD CONSTRAINT "TestCampaignReview_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
