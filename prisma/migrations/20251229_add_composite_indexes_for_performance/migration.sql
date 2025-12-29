-- CreateIndex
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");

-- CreateIndex
CREATE INDEX "Invoice_status_remindersEnabled_idx" ON "Invoice"("status", "remindersEnabled");

-- CreateIndex
CREATE INDEX "Template_userId_createdAt_idx" ON "Template"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Schedule_userId_createdAt_idx" ON "Schedule"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FollowUp_status_scheduledDate_idx" ON "FollowUp"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt" DESC);

-- CreateIndex
CREATE INDEX "EmailLog_followUpId_sentAt_idx" ON "EmailLog"("followUpId", "sentAt");

-- CreateIndex
CREATE INDEX "Subscription_status_endsAt_idx" ON "Subscription"("status", "endsAt");
