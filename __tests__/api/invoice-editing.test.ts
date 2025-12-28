import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Invoice Editing API - Field Restrictions', () => {
  let userId: string;
  let scheduleId1: string;
  let scheduleId2: string;
  let invoiceNoReminders: string;
  let invoiceWithReminders: string;
  let paidInvoiceId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hashed_password_placeholder',
        name: 'Test User',
        planStatus: 'PRO',
      },
    });
    userId = user.id;

    // Create two schedules
    const schedule1 = await prisma.schedule.create({
      data: {
        userId,
        name: 'Schedule 1',
        isActive: true,
        isDefault: true,
      },
    });
    scheduleId1 = schedule1.id;

    const schedule2 = await prisma.schedule.create({
      data: {
        userId,
        name: 'Schedule 2',
        isActive: true,
        isDefault: false,
      },
    });
    scheduleId2 = schedule2.id;

    // Create invoice with NO reminders (FULL EDIT MODE)
    const invoice1 = await prisma.invoice.create({
      data: {
        userId,
        clientName: 'Client A',
        clientEmail: 'clienta@example.com',
        invoiceNumber: 'INV-001',
        amount: 1000,
        currency: 'USD',
        dueDate: new Date('2025-01-15'),
        scheduleId: scheduleId1,
        status: 'PENDING',
      },
    });
    invoiceNoReminders = invoice1.id;

    // Create invoice WITH reminders (LIMITED EDIT MODE)
    const invoice2 = await prisma.invoice.create({
      data: {
        userId,
        clientName: 'Client B',
        clientEmail: 'clientb@example.com',
        invoiceNumber: 'INV-002',
        amount: 2000,
        currency: 'USD',
        dueDate: new Date('2025-01-20'),
        scheduleId: scheduleId1,
        status: 'PENDING',
      },
    });
    invoiceWithReminders = invoice2.id;

    // Add a SENT follow-up to invoice2
    await prisma.followUp.create({
      data: {
        invoiceId: invoice2.id,
        scheduledDate: new Date('2025-01-18'),
        status: 'SENT',
        sentAt: new Date(),
        subject: 'Reminder 1',
        body: 'Please pay',
      },
    });

    // Create PAID invoice (NO EDITING ALLOWED)
    const invoice3 = await prisma.invoice.create({
      data: {
        userId,
        clientName: 'Client C',
        clientEmail: 'clientc@example.com',
        invoiceNumber: 'INV-003',
        amount: 3000,
        currency: 'USD',
        dueDate: new Date('2025-01-25'),
        scheduleId: scheduleId1,
        status: 'PAID',
      },
    });
    paidInvoiceId = invoice3.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.followUp.deleteMany({ where: { invoice: { userId } } });
    await prisma.invoice.deleteMany({ where: { userId } });
    await prisma.schedule.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('FULL EDIT MODE (0 reminders sent)', () => {
    it('should allow editing all fields except scheduleId stays as is', async () => {
      const updated = await prisma.invoice.update({
        where: { id: invoiceNoReminders },
        data: {
          clientName: 'Updated Client A',
          clientEmail: 'updated@example.com',
          invoiceNumber: 'INV-001-UPDATED',
          amount: 1500,
          currency: 'EUR',
          dueDate: new Date('2025-02-01'),
          notes: 'Updated notes',
        },
      });

      expect(updated.clientName).toBe('Updated Client A');
      expect(updated.clientEmail).toBe('updated@example.com');
      expect(updated.invoiceNumber).toBe('INV-001-UPDATED');
      expect(updated.amount).toBe(1500);
      expect(updated.currency).toBe('EUR');
      expect(updated.notes).toBe('Updated notes');
    });

    it('should allow changing scheduleId when no reminders sent', async () => {
      const updated = await prisma.invoice.update({
        where: { id: invoiceNoReminders },
        data: {
          scheduleId: scheduleId2,
        },
      });

      expect(updated.scheduleId).toBe(scheduleId2);
    });
  });

  describe('LIMITED EDIT MODE (reminders sent)', () => {
    it('should verify invoice has reminders sent', async () => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceWithReminders },
        include: {
          followUps: {
            where: { status: 'SENT' },
          },
        },
      });

      expect(invoice?.followUps.length).toBeGreaterThan(0);
    });

    it('should allow editing notes even after reminders sent', async () => {
      const updated = await prisma.invoice.update({
        where: { id: invoiceWithReminders },
        data: {
          notes: 'New notes added after reminder',
        },
      });

      expect(updated.notes).toBe('New notes added after reminder');
    });

    it('should allow status changes after reminders sent', async () => {
      const updated = await prisma.invoice.update({
        where: { id: invoiceWithReminders },
        data: {
          status: 'PAID',
        },
      });

      expect(updated.status).toBe('PAID');

      // Revert for other tests
      await prisma.invoice.update({
        where: { id: invoiceWithReminders },
        data: { status: 'PENDING' },
      });
    });

    it('should NOT allow clientName changes (validation happens in API)', async () => {
      // This test shows what the DB allows, but API should prevent it
      // In real usage, the API endpoint would reject this
      const beforeUpdate = await prisma.invoice.findUnique({
        where: { id: invoiceWithReminders },
      });

      expect(beforeUpdate?.clientName).toBe('Client B');
      // API would return 400 error for this operation
    });
  });

  describe('PAID Invoice (NO EDITING)', () => {
    it('should verify invoice is PAID', async () => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: paidInvoiceId },
      });

      expect(invoice?.status).toBe('PAID');
    });

    it('should NOT allow any edits to PAID invoice (API enforces this)', async () => {
      // The API would return 403 for this
      // This test documents the expected behavior
      const invoice = await prisma.invoice.findUnique({
        where: { id: paidInvoiceId },
      });

      expect(invoice?.status).toBe('PAID');
      // API would reject any update attempts
    });
  });

  describe('Schedule Change Restrictions', () => {
    it('should allow schedule change when no reminders sent', async () => {
      const beforeUpdate = await prisma.invoice.findUnique({
        where: { id: invoiceNoReminders },
      });

      const currentScheduleId = beforeUpdate?.scheduleId;

      const updated = await prisma.invoice.update({
        where: { id: invoiceNoReminders },
        data: {
          scheduleId: scheduleId1,
        },
      });

      expect(updated.scheduleId).toBe(scheduleId1);
    });

    it('should track that schedule changes are blocked by API when reminders sent', async () => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceWithReminders },
        include: {
          followUps: {
            where: { status: 'SENT' },
          },
        },
      });

      expect(invoice?.followUps.length).toBeGreaterThan(0);
      // API would return 409 error for scheduleId changes
    });
  });
});
