/**
 * Tests for Cron Job Reminder Control Logic
 * Ensures reminders respect the remindersEnabled flag
 */

import { POST } from '@/app/api/cron/run-followups/route';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || 'GET',
    headers: {
      get: (key: string) => init?.headers?.[key.toLowerCase()],
    },
  })),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('resend');

describe('Cron Job Reminder Control', () => {
  const mockToday = new Date('2024-12-28T00:00:00.000Z');
  const mockTomorrow = new Date('2024-12-29T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(mockToday);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('remindersEnabled flag behavior', () => {
    it('should only send reminders when remindersEnabled is true', async () => {
      // Mock follow-ups with enabled reminders
      const enabledFollowUp = {
        id: 'followup-1',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        scheduledDate: mockToday,
        subject: 'Reminder',
        body: 'Payment due',
        invoice: {
          id: 'invoice-1',
          clientEmail: 'client@example.com',
          status: 'PENDING',
          remindersEnabled: true, // Enabled
          user: { id: 'user-1', email: 'user@example.com' },
        },
      };

      (prisma.followUp.findMany as jest.Mock).mockResolvedValue([enabledFollowUp]);
      (prisma.emailLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.emailLog.create as jest.Mock).mockResolvedValue({});
      (prisma.followUp.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/cron/run-followups', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify follow-up was processed
      expect(data.sent).toBeGreaterThan(0);
      expect(prisma.followUp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'followup-1' },
          data: expect.objectContaining({
            status: 'SENT',
          }),
        })
      );
    });

    it('should skip reminders when remindersEnabled is false', async () => {
      // This should be filtered out by the query
      (prisma.followUp.findMany as jest.Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/cron/run-followups', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify no follow-ups were processed
      expect(data.total).toBe(0);
      expect(data.sent).toBe(0);

      // Verify query includes remindersEnabled check
      expect(prisma.followUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              remindersEnabled: true,
            }),
          }),
        })
      );
    });

    it('should not send reminders for paused invoices even if follow-ups exist', async () => {
      // The query should filter these out
      (prisma.followUp.findMany as jest.Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/cron/run-followups', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      await POST(req);

      // Verify the query filters by remindersEnabled
      expect(prisma.followUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            invoice: expect.objectContaining({
              status: 'PENDING',
              remindersEnabled: true,
            }),
          }),
        })
      );
    });
  });

  describe('Reminder completion tracking', () => {
    it('should mark reminders as completed when last one is sent', async () => {
      const lastFollowUp = {
        id: 'followup-last',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        scheduledDate: mockToday,
        subject: 'Final Reminder',
        body: 'Last notice',
        invoice: {
          id: 'invoice-1',
          clientEmail: 'client@example.com',
          status: 'PENDING',
          remindersEnabled: true,
          user: { id: 'user-1', email: 'user@example.com' },
        },
      };

      (prisma.followUp.findMany as jest.Mock).mockResolvedValue([lastFollowUp]);
      (prisma.emailLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.followUp.count as jest.Mock)
        .mockResolvedValueOnce(3) // Total follow-ups
        .mockResolvedValueOnce(3); // Sent follow-ups (all sent after this one)
      (prisma.emailLog.create as jest.Mock).mockResolvedValue({});
      (prisma.followUp.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/cron/run-followups', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      await POST(req);

      // Verify invoice was marked as completed
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'invoice-1' },
          data: expect.objectContaining({
            remindersCompleted: true,
            totalScheduledReminders: 3,
          }),
        })
      );
    });

    it('should update lastReminderSentAt when sending', async () => {
      const followUp = {
        id: 'followup-1',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        scheduledDate: mockToday,
        subject: 'Reminder',
        body: 'Payment due',
        invoice: {
          id: 'invoice-1',
          clientEmail: 'client@example.com',
          status: 'PENDING',
          remindersEnabled: true,
          user: { id: 'user-1', email: 'user@example.com' },
        },
      };

      (prisma.followUp.findMany as jest.Mock).mockResolvedValue([followUp]);
      (prisma.emailLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.emailLog.create as jest.Mock).mockResolvedValue({});
      (prisma.followUp.update as jest.Mock).mockResolvedValue({});
      (prisma.followUp.count as jest.Mock).mockResolvedValue(1);
      (prisma.invoice.update as jest.Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/cron/run-followups', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      await POST(req);

      // Verify lastReminderSentAt was updated
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'invoice-1' },
          data: expect.objectContaining({
            lastReminderSentAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should respect daily limit even for enabled reminders', async () => {
      const followUp = {
        id: 'followup-1',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        scheduledDate: mockToday,
        subject: 'Reminder',
        body: 'Payment due',
        invoice: {
          id: 'invoice-1',
          clientEmail: 'client@example.com',
          status: 'PENDING',
          remindersEnabled: true,
          user: { id: 'user-1', email: 'user@example.com' },
        },
      };

      (prisma.followUp.findMany as jest.Mock).mockResolvedValue([followUp]);
      // Simulate max daily limit reached
      (prisma.emailLog.count as jest.Mock).mockResolvedValue(5); // Assuming limit is 5
      (prisma.followUp.update as jest.Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/cron/run-followups', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify follow-up was skipped
      expect(data.skipped).toBeGreaterThan(0);
      expect(prisma.followUp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'followup-1' },
          data: expect.objectContaining({
            status: 'SKIPPED',
            errorMessage: expect.stringContaining('limit'),
          }),
        })
      );
    });

    it('should handle email sending failures gracefully', async () => {
      const followUp = {
        id: 'followup-1',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        scheduledDate: mockToday,
        subject: 'Reminder',
        body: 'Payment due',
        invoice: {
          id: 'invoice-1',
          clientEmail: 'client@example.com',
          status: 'PENDING',
          remindersEnabled: true,
          user: { id: 'user-1', email: 'user@example.com' },
        },
      };

      (prisma.followUp.findMany as jest.Mock).mockResolvedValue([followUp]);
      (prisma.emailLog.count as jest.Mock).mockResolvedValue(0);

      // Simulate email service failure
      const mockError = new Error('Email service unavailable');
      (prisma.emailLog.create as jest.Mock).mockRejectedValue(mockError);
      (prisma.followUp.update as jest.Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/cron/run-followups', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      const response = await POST(req);
      const data = await response.json();

      // Verify failure was recorded
      expect(data.failed).toBeGreaterThan(0);
      expect(prisma.followUp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'followup-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: expect.stringContaining('Email service unavailable'),
          }),
        })
      );
    });
  });
});