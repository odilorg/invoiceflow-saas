import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import InvoiceDetailPage from '@/app/dashboard/invoices/[id]/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockInvoice = {
  id: '1',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  invoiceNumber: 'INV-001',
  amount: 1000,
  currency: 'USD',
  dueDate: new Date('2025-01-15').toISOString(),
  status: 'PENDING',
  notes: 'Test notes',
  createdAt: new Date('2025-01-01').toISOString(),
  followUps: [
    {
      id: 'f1',
      subject: 'Payment Reminder',
      body: 'Please pay invoice INV-001',
      scheduledDate: new Date('2025-01-15').toISOString(),
      status: 'PENDING',
    },
    {
      id: 'f2',
      subject: 'Second Reminder',
      body: 'This is your second reminder',
      scheduledDate: new Date('2025-01-18').toISOString(),
      status: 'SENT',
      sentAt: new Date('2025-01-18T10:00:00').toISOString(),
      logs: [{ id: 'log1' }],
    },
  ],
};

describe('InvoiceDetailPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useParams as jest.Mock).mockReturnValue({
      id: '1',
    });
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    render(<InvoiceDetailPage />);

    expect(screen.getByText('Loading invoice...')).toBeInTheDocument();
  });

  it('should render invoice details after loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('USD 1,000')).toBeInTheDocument();
    });
  });

  it('should display follow-ups section', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Follow-ups')).toBeInTheDocument();
      expect(screen.getByText('Payment Reminder')).toBeInTheDocument();
      expect(screen.getByText('Second Reminder')).toBeInTheDocument();
    });
  });

  it('should show follow-up status badges', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('SENT')).toBeInTheDocument();
    });
  });

  it('should enable editing mode when clicking Edit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    // Should show form fields
    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('INV-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });
  });

  it('should update invoice when saving changes', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Initial GET
        return Promise.resolve({
          ok: true,
          json: async () => mockInvoice,
        });
      } else if (options?.method === 'PATCH') {
        // PATCH update
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockInvoice, clientName: 'Updated Name' }),
        });
      } else {
        // Refresh GET
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockInvoice, clientName: 'Updated Name' }),
        });
      }
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
    });

    // Click edit
    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    // Update client name
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/invoices/1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('should cancel editing mode', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
    });

    // Click edit
    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Should go back to view mode
    await waitFor(() => {
      expect(screen.queryByDisplayValue('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('should navigate back to invoices list', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
    });

    const backButton = screen.getByText(/Back to Invoices/i);
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices');
  });

  it('should redirect to login if unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should redirect to invoices list if invoice not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/invoices');
    });
  });

  it('should show overdue status for overdue invoices', async () => {
    const overdueInvoice = {
      ...mockInvoice,
      dueDate: new Date('2024-01-01').toISOString(),
      status: 'PENDING',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => overdueInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('OVERDUE')).toBeInTheDocument();
    });
  });

  it('should show paid status correctly', async () => {
    const paidInvoice = {
      ...mockInvoice,
      status: 'PAID',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => paidInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('PAID')).toBeInTheDocument();
    });
  });

  it('should display email log count for sent follow-ups', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/1 email log/i)).toBeInTheDocument();
    });
  });

  it('should show sent timestamp for sent follow-ups', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Sent:/i)).toBeInTheDocument();
    });
  });

  it('should update invoice status in edit mode', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => mockInvoice,
        });
      } else if (options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockInvoice, status: 'PAID' }),
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockInvoice, status: 'PAID' }),
        });
      }
    });

    render(<InvoiceDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeInTheDocument();
    });

    // Click edit
    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    // Find the status select by label
    const statusSelect = screen.getByLabelText(/Status/i) as HTMLSelectElement;
    expect(statusSelect.value).toBe('PENDING');

    // Change status to PAID
    fireEvent.change(statusSelect, { target: { value: 'PAID' } });
    expect(statusSelect.value).toBe('PAID');

    // Save
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/invoices/1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('PAID'),
        })
      );
    });
  });
});
