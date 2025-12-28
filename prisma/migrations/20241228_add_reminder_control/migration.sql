-- Add reminder control fields to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Invoice" ADD COLUMN "remindersBaseDueDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "remindersResetAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "remindersPausedReason" TEXT;

-- Add index for remindersEnabled
CREATE INDEX "Invoice_remindersEnabled_idx" ON "Invoice"("remindersEnabled");

-- Set remindersBaseDueDate to existing dueDate for all invoices
UPDATE "Invoice" SET "remindersBaseDueDate" = "dueDate" WHERE "remindersBaseDueDate" IS NULL;