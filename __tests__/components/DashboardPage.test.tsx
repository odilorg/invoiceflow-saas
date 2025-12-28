import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/dashboard/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockStats = {
  totalInvoices: 10,
  pendingInvoices: 5,
  paidInvoices: 5,
  overdueInvoices: 2,
  totalFollowUpsSent: 15,
  upcomingFollowUps: 3,
  planStatus: 'FREE',
};

const mockInvoices = [
  {
    id: '1',
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    invoiceNumber: 'INV-001',
    amount: 1000,
    currency: 'USD',
    dueDate: '2024-01-01T00:00:00.000Z', // Past date - overdue
    status: 'PENDING',
  },
];

const mockTemplates = [
  {
    id: '1',
    name: 'Friendly Reminder',
    subject: 'Test subject',
    body: 'Test body',
  },
];

const mockSchedules = [
  {
    id: '1',
    name: 'Standard Follow-up',
    isActive: true,
  },
];

describe('DashboardPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  describe('Setup Prompts', () => {
    it('should show "Create Template" prompt when no templates exist', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockStats,
          });
        }
        if (url.includes('/api/invoices')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockInvoices,
          });
        }
        if (url.includes('/api/templates')) {
          return Promise.resolve({
            ok: true,
            json: async () => [], // No templates
          });
        }
        if (url.includes('/api/schedules')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSchedules,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Create your first email template')).toBeInTheDocument();
        expect(screen.getByText('Start by creating email templates for your invoice follow-ups.')).toBeInTheDocument();
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });
    });

    it('should show "Create Schedule" prompt when templates exist but no active schedule', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockStats,
          });
        }
        if (url.includes('/api/invoices')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockInvoices,
          });
        }
        if (url.includes('/api/templates')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTemplates, // Templates exist
          });
        }
        if (url.includes('/api/schedules')) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: '1', name: 'Test', isActive: false }], // No active schedule
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Set up your follow-up schedule')).toBeInTheDocument();
        expect(screen.getByText('Configure when follow-up emails should be sent for overdue invoices.')).toBeInTheDocument();
        expect(screen.getByText('Create Schedule')).toBeInTheDocument();
      });
    });

    it('should show "Add Invoice" prompt when templates and schedule exist but no invoices', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockStats,
          });
        }
        if (url.includes('/api/invoices')) {
          return Promise.resolve({
            ok: true,
            json: async () => [], // No invoices
          });
        }
        if (url.includes('/api/templates')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTemplates,
          });
        }
        if (url.includes('/api/schedules')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSchedules, // Active schedule exists
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Add your first invoice')).toBeInTheDocument();
        expect(screen.getByText('Start tracking invoices and automate follow-ups for overdue payments.')).toBeInTheDocument();
        expect(screen.getByText('Add Invoice')).toBeInTheDocument();
      });
    });

    it('should NOT show any prompt when setup is complete', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockStats,
          });
        }
        if (url.includes('/api/invoices')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockInvoices, // Invoices exist
          });
        }
        if (url.includes('/api/templates')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTemplates, // Templates exist
          });
        }
        if (url.includes('/api/schedules')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSchedules, // Active schedule exists
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Should NOT show any setup prompts
      expect(screen.queryByText('Create your first email template')).not.toBeInTheDocument();
      expect(screen.queryByText('Set up your follow-up schedule')).not.toBeInTheDocument();
      expect(screen.queryByText('Add your first invoice')).not.toBeInTheDocument();
    });

    it('should show only ONE prompt at a time (priority: templates > schedule > invoices)', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockStats,
          });
        }
        if (url.includes('/api/invoices')) {
          return Promise.resolve({
            ok: true,
            json: async () => [], // No invoices
          });
        }
        if (url.includes('/api/templates')) {
          return Promise.resolve({
            ok: true,
            json: async () => [], // No templates
          });
        }
        if (url.includes('/api/schedules')) {
          return Promise.resolve({
            ok: true,
            json: async () => [], // No schedules
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<DashboardPage />);

      await waitFor(() => {
        // Should show template prompt (highest priority)
        expect(screen.getByText('Create your first email template')).toBeInTheDocument();
      });

      // Should NOT show schedule or invoice prompts
      expect(screen.queryByText('Set up your follow-up schedule')).not.toBeInTheDocument();
      expect(screen.queryByText('Add your first invoice')).not.toBeInTheDocument();
    });
  });

  describe('Dashboard Display', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockStats,
          });
        }
        if (url.includes('/api/invoices')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockInvoices,
          });
        }
        if (url.includes('/api/templates')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTemplates,
          });
        }
        if (url.includes('/api/schedules')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSchedules,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('should render dashboard title and description', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Overview of your invoices and follow-ups')).toBeInTheDocument();
      });
    });

    it('should display stats correctly', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Unpaid Invoices')).toBeInTheDocument();
        expect(screen.getByText('Overdue')).toBeInTheDocument();
        expect(screen.getByText('Paid This Month')).toBeInTheDocument();
      });
    });

    it('should display overdue invoices section', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Overdue Invoices')).toBeInTheDocument();
        expect(screen.getByText('INV-001')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DashboardPage />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('should display free plan notice when on free plan', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument();
        expect(screen.getByText('Upgrade')).toBeInTheDocument();
      });
    });
  });
});
