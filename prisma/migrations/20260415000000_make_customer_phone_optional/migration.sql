-- Make Customer.phone nullable to support quick-creation without phone number
ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;

