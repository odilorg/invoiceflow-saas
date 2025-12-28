import { getReminderState, getReminderStateDisplay, isReminderExhausted, getReminderStatusMessage } from '@/lib/reminder-state';

describe('Reminder State Utilities', () => {
  describe('getReminderState', () => {
    it('should return STOPPED for paid invoices', () => {
      const invoice = {
        status: 'PAID',
        remindersCompleted: false,
        lastReminderSentAt: null,
        totalScheduledReminders: 3,
        followUps: []
      };
      expect(getReminderState(invoice)).toBe('STOPPED');
    });

    it('should return COMPLETED when remindersCompleted is true', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: true,
        lastReminderSentAt: new Date(),
        totalScheduledReminders: 3,
        followUps: []
      };
      expect(getReminderState(invoice)).toBe('COMPLETED');
    });

    it('should return NOT_STARTED when no reminders sent', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: false,
        lastReminderSentAt: null,
        totalScheduledReminders: 3,
        followUps: []
      };
      expect(getReminderState(invoice)).toBe('NOT_STARTED');
    });

    it('should return IN_PROGRESS when some reminders sent but not all', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: false,
        lastReminderSentAt: new Date(),
        totalScheduledReminders: 3,
        followUps: [
          { status: 'SENT', sentAt: new Date() },
          { status: 'PENDING', sentAt: null }
        ]
      };
      expect(getReminderState(invoice)).toBe('IN_PROGRESS');
    });

    it('should return COMPLETED when all scheduled reminders are sent', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: false,
        lastReminderSentAt: new Date(),
        totalScheduledReminders: 2,
        followUps: [
          { status: 'SENT', sentAt: new Date() },
          { status: 'SENT', sentAt: new Date() }
        ]
      };
      expect(getReminderState(invoice)).toBe('COMPLETED');
    });
  });

  describe('getReminderStateDisplay', () => {
    it('should return correct display for NOT_STARTED', () => {
      const display = getReminderStateDisplay('NOT_STARTED');
      expect(display.label).toBe('Reminders Pending');
      expect(display.color).toBe('slate');
      expect(display.description).toBe('No reminders sent yet');
    });

    it('should return correct display for IN_PROGRESS', () => {
      const display = getReminderStateDisplay('IN_PROGRESS');
      expect(display.label).toBe('Reminders Active');
      expect(display.color).toBe('blue');
      expect(display.description).toBe('Sending scheduled reminders');
    });

    it('should return correct display for COMPLETED', () => {
      const display = getReminderStateDisplay('COMPLETED');
      expect(display.label).toBe('Reminders Completed');
      expect(display.color).toBe('amber');
      expect(display.description).toContain('manual action needed');
    });

    it('should return correct display for STOPPED', () => {
      const display = getReminderStateDisplay('STOPPED');
      expect(display.label).toBe('Paid');
      expect(display.color).toBe('green');
      expect(display.description).toContain('reminders stopped');
    });
  });

  describe('isReminderExhausted', () => {
    it('should return true when reminders are completed', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: true,
        lastReminderSentAt: new Date(),
        totalScheduledReminders: 3,
        followUps: []
      };
      expect(isReminderExhausted(invoice)).toBe(true);
    });

    it('should return false when reminders are not completed', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: false,
        lastReminderSentAt: null,
        totalScheduledReminders: 3,
        followUps: []
      };
      expect(isReminderExhausted(invoice)).toBe(false);
    });
  });

  describe('getReminderStatusMessage', () => {
    it('should return completion message for COMPLETED state', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: true,
        lastReminderSentAt: new Date(),
        totalScheduledReminders: 3,
        followUps: []
      };
      const message = getReminderStatusMessage(invoice);
      expect(message).toContain('All scheduled reminder emails have been sent');
      expect(message).toContain('will not send more emails');
    });

    it('should return progress message for IN_PROGRESS state', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: false,
        lastReminderSentAt: new Date(),
        totalScheduledReminders: 3,
        followUps: [
          { status: 'SENT', sentAt: new Date() }
        ]
      };
      const message = getReminderStatusMessage(invoice);
      expect(message).toContain('1 of 3 scheduled reminders sent');
    });

    it('should return pending message for NOT_STARTED state', () => {
      const invoice = {
        status: 'PENDING',
        remindersCompleted: false,
        lastReminderSentAt: null,
        totalScheduledReminders: 3,
        followUps: []
      };
      const message = getReminderStatusMessage(invoice);
      expect(message).toContain('Reminders will be sent based on your schedule');
    });
  });
});