import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import TemplatesPage from '@/app/dashboard/templates/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockTemplates = [
  {
    id: '1',
    name: 'Friendly Reminder',
    subject: 'Gentle reminder about invoice {invoiceNumber}',
    body: 'Hi {clientName}, just a friendly reminder...',
    isDefault: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: '2',
    name: 'Firm Reminder',
    subject: 'Urgent: Payment overdue for {invoiceNumber}',
    body: 'Dear {clientName}, your payment is overdue...',
    isDefault: false,
    createdAt: new Date('2025-01-02').toISOString(),
  },
];

describe('TemplatesPage', () => {
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

    render(<TemplatesPage />);

    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('should render templates list after loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
      expect(screen.getByText('Firm Reminder')).toBeInTheDocument();
    });
  });

  it('should show Create Template button', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Create Template/i)[0]).toBeInTheDocument();
    });
  });

  it('should show default badge for default template', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  it('should open create modal when clicking Create Template', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
    });

    const createButton = screen.getAllByText(/Create Template/i)[0];
    fireEvent.click(createButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Template Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Subject Line/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Body/i)).toBeInTheDocument();
    });
  });

  it('should create new template via modal', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Initial GET
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      } else if (options?.method === 'POST') {
        // POST create
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: '999', ...mockTemplates[0] }),
        });
      } else {
        // Refresh GET
        return Promise.resolve({
          ok: true,
          json: async () => [mockTemplates[0]],
        });
      }
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No templates found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Template/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Template Name/i)).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Template Name/i), {
      target: { value: 'Test Template' },
    });
    fireEvent.change(screen.getByLabelText(/Subject Line/i), {
      target: { value: 'Test Subject {invoiceNumber}' },
    });
    fireEvent.change(screen.getByLabelText(/Email Body/i), {
      target: { value: 'Hi {clientName}, test body...' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /^Create Template$/i });
    fireEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should open edit modal when clicking Edit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText(/Edit/i);
    fireEvent.click(editButtons[0]);

    // Modal should appear with existing data
    await waitFor(() => {
      expect(screen.getByDisplayValue('Friendly Reminder')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Gentle reminder/i)).toBeInTheDocument();
    });
  });

  it('should update template via edit modal', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Initial GET
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      } else if (options?.method === 'PATCH') {
        // PATCH update
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockTemplates[0], name: 'Updated Template' }),
        });
      } else {
        // Refresh GET
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
    });

    // Click edit
    const editButtons = screen.getAllByText(/Edit/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Friendly Reminder')).toBeInTheDocument();
    });

    // Update name
    const nameInput = screen.getByDisplayValue('Friendly Reminder');
    fireEvent.change(nameInput, { target: { value: 'Updated Template' } });

    // Submit
    const updateButton = screen.getByRole('button', { name: /Update Template/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates/1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('should delete template with confirmation', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      } else if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates.slice(1),
        });
      }
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/Delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this template?');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    confirmSpy.mockRestore();
  });

  it('should not delete template if user cancels', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/Delete/i);
    const initialFetchCalls = (global.fetch as jest.Mock).mock.calls.length;

    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();

    // Should not make DELETE request
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(initialFetchCalls);

    confirmSpy.mockRestore();
  });

  it('should navigate back to dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
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

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should show empty state when no templates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No templates found/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first template to get started/i)).toBeInTheDocument();
    });
  });

  it('should show variable hints in modal', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getAllByText(/Create Template/i)[0];
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/{clientName}/i)).toBeInTheDocument();
      expect(screen.getByText(/{amount}/i)).toBeInTheDocument();
      expect(screen.getByText(/{invoiceNumber}/i)).toBeInTheDocument();
    });
  });

  it('should close modal when clicking Cancel', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Friendly Reminder')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getAllByText(/Create Template/i)[0];
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Template Name/i)).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByLabelText(/Template Name/i)).not.toBeInTheDocument();
    });
  });

  it('should set template as default via checkbox', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      } else if (options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: '999', ...body }),
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No templates found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Template/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Template Name/i)).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Template Name/i), {
      target: { value: 'Test Template' },
    });
    fireEvent.change(screen.getByLabelText(/Subject Line/i), {
      target: { value: 'Test Subject' },
    });
    fireEvent.change(screen.getByLabelText(/Email Body/i), {
      target: { value: 'Test Body' },
    });

    // Check "Set as default"
    const defaultCheckbox = screen.getByLabelText(/Set as default/i);
    fireEvent.click(defaultCheckbox);

    // Submit
    const submitButton = screen.getByRole('button', { name: /^Create Template$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"isDefault":true'),
        })
      );
    });
  });
});
