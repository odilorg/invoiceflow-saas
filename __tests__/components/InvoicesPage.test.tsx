import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import InvoicesPage from '@/app/dashboard/invoices/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockInvoices = [
  {
    id: '1',
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    invoiceNumber: 'INV-001',
    amount: 1000,
    currency: 'USD',
    dueDate: '2025-06-15T00:00:00.000Z', // Future date
    status: 'PENDING',
    createdAt: '2025-01-01T00:00:00.000Z',
    followUps: [],
  },
  {
    id: '2',
    clientName: 'Jane Smith',
    clientEmail: 'jane@example.com',
    invoiceNumber: 'INV-002',
    amount: 2500,
    currency: 'EUR',
    dueDate: '2024-01-01T00:00:00.000Z', // Past date - overdue
    status: 'PENDING',
    createdAt: '2024-01-01T00:00:00.000Z',
    followUps: [{ id: 'f1' }],
  },
  {
    id: '3',
    clientName: 'Bob Johnson',
    clientEmail: 'bob@example.com',
    invoiceNumber: 'INV-003',
    amount: 500,
    currency: 'USD',
    dueDate: '2025-06-01T00:00:00.000Z', // Future date
    status: 'PAID',
    createdAt: '2025-01-05T00:00:00.000Z',
    followUps: [],
  },
];

describe('InvoicesPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    render(<InvoicesPage />);

    expect(screen.getByText('Loading invoices...')).toBeInTheDocument();
  });

  it('should render invoices list after loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should show Create Invoice button', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Create Invoice/i)[0]).toBeInTheDocument();
    });
  });

  it('should filter invoices by status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Click "Paid" filter
    const paidButton = screen.getByRole('button', { name: /^Paid$/i });
    fireEvent.click(paidButton);

    // Should only show paid invoices
    expect(screen.getByText('INV-003')).toBeInTheDocument();
    expect(screen.queryByText('INV-001')).not.toBeInTheDocument();
  });

  it('should filter overdue invoices', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Click "Overdue" filter
    const overdueButton = screen.getByRole('button', { name: /^Overdue$/i });
    fireEvent.click(overdueButton);

    // INV-002 has due date in the past and status PENDING
    expect(screen.getByText('INV-002')).toBeInTheDocument();
    expect(screen.queryByText('INV-001')).not.toBeInTheDocument();
    expect(screen.queryByText('INV-003')).not.toBeInTheDocument();
  });

  it('should open create modal when clicking Create Invoice', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    const createButton = screen.getAllByText(/Create Invoice/i)[0];
    fireEvent.click(createButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Client Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Client Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Invoice Number/i)).toBeInTheDocument();
    });
  });

  it('should create new invoice via modal', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Initial GET
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      } else if (url.includes('/api/invoices') && fetchCallCount === 2) {
        // POST create
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: '999', ...mockInvoices[0] }),
        });
      } else {
        // Refresh GET
        return Promise.resolve({
          ok: true,
          json: async () => [mockInvoices[0]],
        });
      }
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No invoices found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Invoice/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Client Name/i)).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Client Name/i), {
      target: { value: 'Test Client' },
    });
    fireEvent.change(screen.getByLabelText(/Client Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Invoice Number/i), {
      target: { value: 'INV-999' },
    });
    fireEvent.change(screen.getByLabelText(/^Amount/i), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByLabelText(/Due Date/i), {
      target: { value: '2025-02-01' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /^Create Invoice$/i });
    fireEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/invoices',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should mark invoice as paid', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Initial GET
        return Promise.resolve({
          ok: true,
          json: async () => mockInvoices,
        });
      } else if (options?.method === 'PATCH') {
        // PATCH to mark as paid
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockInvoices[0], status: 'PAID' }),
        });
      } else {
        // Refresh GET
        return Promise.resolve({
          ok: true,
          json: async () => mockInvoices,
        });
      }
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // Find and click "Mark Paid" button for INV-001
    const markPaidButtons = screen.getAllByText(/Mark Paid/i);
    fireEvent.click(markPaidButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/invoices/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'PAID' }),
        })
      );
    });
  });

  it('should delete invoice with confirmation', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => mockInvoices,
        });
      } else if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => mockInvoices.slice(1),
        });
      }
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/Delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this invoice?');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/invoices/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    confirmSpy.mockRestore();
  });

  it('should not delete invoice if user cancels', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/Delete/i);
    const initialFetchCalls = (global.fetch as jest.Mock).mock.calls.length;

    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();

    // Should not make DELETE request
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(initialFetchCalls);

    confirmSpy.mockRestore();
  });

  it('should navigate to invoice detail page', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText(/View/i);
    fireEvent.click(viewButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices/1');
  });

  it('should navigate back to dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
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

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should show empty state when no invoices', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No invoices found/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first invoice to get started/i)).toBeInTheDocument();
    });
  });

  it('should display follow-up count per invoice', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('0 scheduled')).toBeInTheDocument();
      expect(screen.getByText('1 scheduled')).toBeInTheDocument();
    });
  });

  it('should show correct status badges', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
      expect(screen.getByText('PAID')).toBeInTheDocument();
      expect(screen.getByText('OVERDUE')).toBeInTheDocument(); // INV-002 is overdue
    });
  });
});
