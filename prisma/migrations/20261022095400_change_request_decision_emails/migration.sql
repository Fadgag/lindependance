ALTER TABLE "Appointment"
ADD COLUMN "calendarSequence" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AppointmentChangeRequest"
ADD COLUMN "verifiedEmail" TEXT;
