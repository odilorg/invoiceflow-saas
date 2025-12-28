-- Add reminder tracking fields to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "totalScheduledReminders" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "remindersCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Add index for remindersCompleted
CREATE INDEX "Invoice_remindersCompleted_idx" ON "Invoice"("remindersCompleted");