CREATE TABLE "AppointmentChangeRequest" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "customerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "requestedEnd" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "reviewReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentChangeRequest_organizationId_status_createdAt_idx"
ON "AppointmentChangeRequest"("organizationId", "status", "createdAt");

CREATE INDEX "AppointmentChangeRequest_appointmentId_status_idx"
ON "AppointmentChangeRequest"("appointmentId", "status");

CREATE INDEX "AppointmentChangeRequest_customerId_createdAt_idx"
ON "AppointmentChangeRequest"("customerId", "createdAt");

CREATE UNIQUE INDEX "AppointmentChangeRequest_one_pending_per_appointment_key"
ON "AppointmentChangeRequest"("appointmentId")
WHERE "status" = 'PENDING' AND "appointmentId" IS NOT NULL;

ALTER TABLE "AppointmentChangeRequest"
ADD CONSTRAINT "AppointmentChangeRequest_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentChangeRequest"
ADD CONSTRAINT "AppointmentChangeRequest_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentChangeRequest"
ADD CONSTRAINT "AppointmentChangeRequest_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
