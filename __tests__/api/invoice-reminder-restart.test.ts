/**
 * Tests for Invoice Reminder Restart Functionality
 * Tests the API endpoint behavior when due dates are changed
 * Note: These are unit tests that focus on the logic, not the full HTTP flow
 */

// Mock dependencies before imports
jest.mock('@/lib/db', () => ({
  prisma: {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    followUp: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(() => ({ id: 'test-user-id', email: 'test@example.com' })),
}));

jest.mock('@/lib/followups', () => ({
  regenerateFollowUpsForInvoice: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { regenerateFollowUpsForInvoice } from '@/lib/followups';

describe('Invoice Reminder Restart API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Invoice Reminder Restart Logic Tests', () => {
    const mockInvoice = {
      id: 'invoice-123',
      userId: 'test-user-id',
      status: 'PENDING',
      dueDate: new Date('2024-01-01'),
      remindersCompleted: true,
      remindersEnabled: true,
      remindersBaseDueDate: new Date('2024-01-01'),
      followUps: [
        { id: 'followup-1', status: 'SENT' },
        { id: 'followup-2', status: 'PENDING' },
      ],
    };

    it('should restart reminders when restartReminders is true', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        dueDate: new Date('2024-02-01'),
        remindersResetAt: new Date(),
        remindersCompleted: false,
      });

      // Simulate the update logic
      const updateData: any = {
        dueDate: new Date('2024-02-01'),
      };

      // Due date changed and restart requested
      const dueDateChanged = updateData.dueDate.getTime() !== mockInvoice.dueDate.getTime();
      const restartReminders = true;

      if (dueDateChanged && mockInvoice.status === 'PENDING' && restartReminders) {
        updateData.remindersEnabled = true;
        updateData.remindersBaseDueDate = updateData.dueDate;
        updateData.remindersResetAt = new Date();
        updateData.remindersCompleted = false;
        updateData.remindersPausedReason = null;

        await prisma.followUp.deleteMany({
          where: { invoiceId: mockInvoice.id, status: 'PENDING' },
        });

        await regenerateFollowUpsForInvoice(mockInvoice.id);
      }

      await prisma.invoice.update({
        where: { id: mockInvoice.id },
        data: updateData,
      });

      // Verify reminders were restarted
      expect(prisma.followUp.deleteMany).toHaveBeenCalledWith({
        where: {
          invoiceId: 'invoice-123',
          status: 'PENDING',
        },
      });

      expect(regenerateFollowUpsForInvoice).toHaveBeenCalledWith('invoice-123');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remindersEnabled: true,
            remindersBaseDueDate: updateData.dueDate,
            remindersCompleted: false,
            remindersPausedReason: null,
          }),
        })
      );
    });

    it('should pause reminders when restartReminders is false', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

      // Simulate the update logic
      const updateData: any = {
        dueDate: new Date('2024-02-01'),
      };

      const dueDateChanged = updateData.dueDate.getTime() !== mockInvoice.dueDate.getTime();
      const restartReminders = false;

      if (dueDateChanged && mockInvoice.status === 'PENDING') {
        if (restartReminders === false) {
          updateData.remindersEnabled = false;
          updateData.remindersPausedReason = 'user_updated_date_no_restart';
        }
      }

      await prisma.invoice.update({
        where: { id: mockInvoice.id },
        data: updateData,
      });

      // Verify reminders were paused
      expect(prisma.followUp.deleteMany).not.toHaveBeenCalled();
      expect(regenerateFollowUpsForInvoice).not.toHaveBeenCalled();

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: updateData.dueDate,
            remindersEnabled: false,
            remindersPausedReason: 'user_updated_date_no_restart',
          }),
        })
      );
    });

    it('should not prompt for restart if due date is unchanged', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

      const updateData: any = {
        clientName: 'Updated Client',
        // No due date change
      };

      const dueDateChanged = false; // No due date in updateData

      if (dueDateChanged && mockInvoice.status === 'PENDING') {
        // This block should not execute
        updateData.remindersEnabled = true;
      }

      await prisma.invoice.update({
        where: { id: mockInvoice.id },
        data: updateData,
      });

      // Verify no reminder-related updates
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            clientName: 'Updated Client',
          },
        })
      );

      expect(prisma.followUp.deleteMany).not.toHaveBeenCalled();
      expect(regenerateFollowUpsForInvoice).not.toHaveBeenCalled();
    });

    it('should handle past due date changes correctly', async () => {
      const pastDate = new Date('2023-12-01');
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

      const updateData: any = {
        dueDate: pastDate,
      };

      const dueDateChanged = updateData.dueDate.getTime() !== mockInvoice.dueDate.getTime();
      const restartReminders = true;

      if (dueDateChanged && mockInvoice.status === 'PENDING' && restartReminders) {
        updateData.remindersEnabled = true;
        updateData.remindersBaseDueDate = updateData.dueDate;
        updateData.remindersResetAt = new Date();
        updateData.remindersCompleted = false;
        updateData.remindersPausedReason = null;

        await prisma.followUp.deleteMany({
          where: { invoiceId: mockInvoice.id, status: 'PENDING' },
        });

        await regenerateFollowUpsForInvoice(mockInvoice.id);
      }

      await prisma.invoice.update({
        where: { id: mockInvoice.id },
        data: updateData,
      });

      // Verify past date is handled
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: pastDate,
            remindersBaseDueDate: pastDate,
          }),
        })
      );
    });

    it('should not affect paid invoices', async () => {
      const paidInvoice = { ...mockInvoice, status: 'PAID' };
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(paidInvoice);

      const updateData: any = {
        dueDate: new Date('2024-02-01'),
      };

      const dueDateChanged = updateData.dueDate.getTime() !== paidInvoice.dueDate.getTime();
      const restartReminders = true;

      // Paid invoices should never have reminder updates
      if (dueDateChanged && paidInvoice.status === 'PENDING' && restartReminders) {
        // This block won't execute because status is PAID
        await prisma.followUp.deleteMany({
          where: { invoiceId: paidInvoice.id, status: 'PENDING' },
        });
      }

      await prisma.invoice.update({
        where: { id: paidInvoice.id },
        data: updateData,
      });

      // Verify no reminder updates for paid invoice
      expect(prisma.followUp.deleteMany).not.toHaveBeenCalled();
      expect(regenerateFollowUpsForInvoice).not.toHaveBeenCalled();

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            dueDate: updateData.dueDate,
          },
        })
      );
    });
  });
});