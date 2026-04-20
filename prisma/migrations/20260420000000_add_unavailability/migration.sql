-- CreateTable: Unavailability
-- Blocs d'indisponibilité (congés, RDV perso...). Non comptabilisés dans le CA.
CREATE TABLE "Unavailability" (
    "id"             TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "start"          TIMESTAMP(3) NOT NULL,
    "end"            TIMESTAMP(3) NOT NULL,
    "allDay"         BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unavailability_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Unavailability_organizationId_start_idx" ON "Unavailability"("organizationId", "start");

