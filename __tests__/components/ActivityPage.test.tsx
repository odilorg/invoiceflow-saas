import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ActivityPage from '@/app/dashboard/activity/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockLogs = [
  {
    id: 'log1',
    recipientEmail: 'john@example.com',
    subject: 'Payment Reminder - INV-001',
    sentAt: new Date('2025-01-15T10:00:00').toISOString(),
    success: true,
    followUp: {
      id: 'f1',
      invoice: {
        invoiceNumber: 'INV-001',
        clientName: 'John Doe',
      },
    },
  },
  {
    id: 'log2',
    recipientEmail: 'jane@example.com',
    subject: 'Overdue Invoice - INV-002',
    sentAt: new Date('2025-01-16T14:30:00').toISOString(),
    success: false,
    errorMessage: 'Invalid email address',
    followUp: {
      id: 'f2',
      invoice: {
        invoiceNumber: 'INV-002',
        clientName: 'Jane Smith',
      },
    },
  },
  {
    id: 'log3',
    recipientEmail: 'bob@example.com',
    subject: 'Final Notice - INV-003',
    sentAt: new Date('2025-01-17T09:15:00').toISOString(),
    success: true,
    followUp: {
      id: 'f3',
      invoice: {
        invoiceNumber: 'INV-003',
        clientName: 'Bob Johnson',
      },
    },
  },
];

describe('ActivityPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {})
    );

    render(<ActivityPage />);

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('should render activity logs after loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  it('should display email subjects', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('Payment Reminder - INV-001')).toBeInTheDocument();
      expect(screen.getByText('Overdue Invoice - INV-002')).toBeInTheDocument();
      expect(screen.getByText('Final Notice - INV-003')).toBeInTheDocument();
    });
  });

  it('should show invoice numbers and client names', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('INV-003')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  it('should display stats correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      // Total sent: 3
      expect(screen.getByText('3')).toBeInTheDocument();
      // Successful: 2
      expect(screen.getByText('2')).toBeInTheDocument();
      // Failed: 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should show success status badge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      const sentBadges = screen.getAllByText('Sent');
      expect(sentBadges).toHaveLength(2); // 2 successful emails
    });
  });

  it('should show failed status badge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('should display error message for failed emails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('should filter logs by success status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    // Click "Success" filter
    const successButton = screen.getByRole('button', { name: /^Success$/i });
    fireEvent.click(successButton);

    // Should only show successful emails
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
  });

  it('should filter logs by failed status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    // Click "Failed" filter
    const failedButton = screen.getByRole('button', { name: /^Failed$/i });
    fireEvent.click(failedButton);

    // Should only show failed emails
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('bob@example.com')).not.toBeInTheDocument();
  });

  it('should show all logs when All filter is selected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    // Click "Failed" filter first
    const failedButton = screen.getByRole('button', { name: /^Failed$/i });
    fireEvent.click(failedButton);

    await waitFor(() => {
      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    });

    // Click "All" filter
    const allButton = screen.getByRole('button', { name: /^All$/i });
    fireEvent.click(allButton);

    // Should show all emails again
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  it('should navigate back to dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    const backButton = screen.getByText(/Back to Dashboard/i);
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should redirect to login if unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should show empty state when no logs', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Email logs will appear here once follow-ups are sent/i)).toBeInTheDocument();
    });
  });

  it('should show stats as zero when no logs', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ActivityPage />);

    await waitFor(() => {
      const zeroTexts = screen.getAllByText('0');
      expect(zeroTexts.length).toBeGreaterThanOrEqual(3); // Total, Successful, Failed all should be 0
    });
  });

  it('should display sent date and time', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      // Dates should be rendered (format depends on locale)
      const dateElements = screen.getAllByText(/2025|01|15|16|17/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('should handle logs without followUp data', async () => {
    const logsWithoutFollowUp = [
      {
        id: 'log1',
        recipientEmail: 'test@example.com',
        subject: 'Test Email',
        sentAt: new Date('2025-01-15T10:00:00').toISOString(),
        success: true,
        followUp: null,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => logsWithoutFollowUp,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      // Should show "-" for missing invoice
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  it('should show filter buttons with correct styling', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    const allButton = screen.getByRole('button', { name: /^All$/i });
    const successButton = screen.getByRole('button', { name: /^Success$/i });
    const failedButton = screen.getByRole('button', { name: /^Failed$/i });

    // All button should have active styling initially
    expect(allButton).toHaveClass('bg-indigo-600');
    expect(successButton).not.toHaveClass('bg-indigo-600');
    expect(failedButton).not.toHaveClass('bg-indigo-600');

    // Click success button
    fireEvent.click(successButton);

    // Success button should now have active styling
    expect(successButton).toHaveClass('bg-indigo-600');
    expect(allButton).not.toHaveClass('bg-indigo-600');
  });

  it('should display page title and description', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('Email Activity')).toBeInTheDocument();
      expect(screen.getByText(/View all sent follow-up emails and their status/i)).toBeInTheDocument();
    });
  });

  it('should display stat labels correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    });

    render(<ActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Sent')).toBeInTheDocument();
      expect(screen.getByText('Successful')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });
});
