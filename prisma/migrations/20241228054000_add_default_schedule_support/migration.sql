-- Add isDefault field to Schedule table
ALTER TABLE "Schedule" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient default schedule lookups
CREATE INDEX "Schedule_userId_isDefault_idx" ON "Schedule"("userId", "isDefault");

-- Set one schedule per user as default (if they have any)
WITH user_schedules AS (
  SELECT DISTINCT ON (s."userId")
    s.id
  FROM "Schedule" s
  WHERE s."isActive" = true
  ORDER BY s."userId", s."updatedAt" DESC
)
UPDATE "Schedule"
SET "isDefault" = true
WHERE id IN (SELECT id FROM user_schedules);