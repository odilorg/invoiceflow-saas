import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SchedulesPage from '@/app/dashboard/schedules/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockSchedules = [
  {
    id: '1',
    name: 'Standard Follow-up',
    isActive: true,
    isDefault: true,
    createdAt: new Date('2025-01-01').toISOString(),
    steps: [
      {
        id: 's1',
        dayOffset: 0,
        templateId: 't1',
        template: { id: 't1', name: 'Friendly Reminder' },
      },
      {
        id: 's2',
        dayOffset: 3,
        templateId: 't2',
        template: { id: 't2', name: 'Second Reminder' },
      },
      {
        id: 's3',
        dayOffset: 7,
        templateId: 't3',
        template: { id: 't3', name: 'Firm Reminder' },
      },
    ],
  },
  {
    id: '2',
    name: 'Aggressive Follow-up',
    isActive: false,
    isDefault: false,
    createdAt: new Date('2025-01-02').toISOString(),
    steps: [
      {
        id: 's4',
        dayOffset: 0,
        templateId: 't3',
        template: { id: 't3', name: 'Firm Reminder' },
      },
    ],
  },
];

const mockTemplates = [
  { id: 't1', name: 'Friendly Reminder' },
  { id: 't2', name: 'Second Reminder' },
  { id: 't3', name: 'Firm Reminder' },
];

describe('SchedulesPage', () => {
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

    render(<SchedulesPage />);

    expect(screen.getByText('Loading schedules...')).toBeInTheDocument();
  });

  it('should render schedules list after loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSchedules,
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Aggressive Follow-up')).toBeInTheDocument();
    });
  });

  it('should show Create Schedule button', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSchedules,
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Create Schedule/i)[0]).toBeInTheDocument();
    });
  });

  it('should show default and active badges', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSchedules,
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('should display schedule steps timeline', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSchedules,
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('On due date')[0]).toBeInTheDocument();
      expect(screen.getByText(/3 days after due date/i)).toBeInTheDocument();
      expect(screen.getByText(/7 days after due date/i)).toBeInTheDocument();
    });
  });

  it('should show template names for each step', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSchedules,
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Friendly Reminder/i)).toBeInTheDocument();
      expect(screen.getByText(/Second Reminder/i)).toBeInTheDocument();
      expect(screen.getByText(/Firm Reminder/i)).toBeInTheDocument();
    });
  });

  it('should open create modal when clicking Create Schedule', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockSchedules,
      });
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up')).toBeInTheDocument();
    });

    const createButton = screen.getAllByText(/Create Schedule/i)[0];
    fireEvent.click(createButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Schedule Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Active/i)).toBeInTheDocument();
    });
  });

  it('should create new schedule with multiple steps', async () => {
    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      } else if (fetchCallCount === 1) {
        // Initial GET schedules
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      } else if (options?.method === 'POST') {
        // POST create
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: '999', ...mockSchedules[0] }),
        });
      } else {
        // Refresh GET
        return Promise.resolve({
          ok: true,
          json: async () => [mockSchedules[0]],
        });
      }
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No schedules found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Schedule/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Schedule Name/i)).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Schedule Name/i), {
      target: { value: 'Test Schedule' },
    });

    // First step should exist by default
    const dayOffsetInputs = screen.getAllByLabelText(/Days after due date/i);
    const templateSelects = screen.getAllByLabelText(/Template/i);

    expect(dayOffsetInputs).toHaveLength(1);
    expect(templateSelects).toHaveLength(1);

    // Fill first step
    fireEvent.change(dayOffsetInputs[0], { target: { value: '0' } });
    fireEvent.change(templateSelects[0], { target: { value: 't1' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /^Create Schedule$/i });
    fireEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/schedules',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should add multiple steps to schedule', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No schedules found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Schedule/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Schedule Name/i)).toBeInTheDocument();
    });

    // Initially should have 1 step
    let dayOffsetInputs = screen.getAllByLabelText(/Days after due date/i);
    expect(dayOffsetInputs).toHaveLength(1);

    // Click "Add Step"
    const addStepButton = screen.getByText(/Add Step/i);
    fireEvent.click(addStepButton);

    // Should now have 2 steps
    await waitFor(() => {
      dayOffsetInputs = screen.getAllByLabelText(/Days after due date/i);
      expect(dayOffsetInputs).toHaveLength(2);
    });

    // Add one more step
    fireEvent.click(addStepButton);

    await waitFor(() => {
      dayOffsetInputs = screen.getAllByLabelText(/Days after due date/i);
      expect(dayOffsetInputs).toHaveLength(3);
    });
  });

  it('should remove step from schedule', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No schedules found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Schedule/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Schedule Name/i)).toBeInTheDocument();
    });

    // Add a second step
    const addStepButton = screen.getByText(/Add Step/i);
    fireEvent.click(addStepButton);

    await waitFor(() => {
      const dayOffsetInputs = screen.getAllByLabelText(/Days after due date/i);
      expect(dayOffsetInputs).toHaveLength(2);
    });

    // Click remove on second step
    const removeButtons = screen.getAllByText(/Remove/i);
    fireEvent.click(removeButtons[0]);

    // Should go back to 1 step
    await waitFor(() => {
      const dayOffsetInputs = screen.getAllByLabelText(/Days after due date/i);
      expect(dayOffsetInputs).toHaveLength(1);
    });
  });

  it('should not allow removing last step', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No schedules found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Schedule/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Schedule Name/i)).toBeInTheDocument();
    });

    // Should not have Remove button when only 1 step
    expect(screen.queryByText(/Remove/i)).not.toBeInTheDocument();
  });

  it('should open edit modal with existing data', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockSchedules,
      });
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText(/Edit/i);
    fireEvent.click(editButtons[0]);

    // Modal should appear with existing data
    await waitFor(() => {
      expect(screen.getByDisplayValue('Standard Follow-up')).toBeInTheDocument();
      const dayOffsetInputs = screen.getAllByDisplayValue('0');
      expect(dayOffsetInputs.length).toBeGreaterThan(0);
    });
  });

  it('should delete schedule with confirmation', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    let fetchCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSchedules,
        });
      } else if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => mockSchedules.slice(1),
        });
      }
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/Delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this schedule?');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/schedules/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    confirmSpy.mockRestore();
  });

  it('should navigate back to dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockSchedules,
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Follow-up')).toBeInTheDocument();
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

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should show empty state when no schedules', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No schedules found/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first schedule to automate follow-ups/i)).toBeInTheDocument();
    });
  });

  it('should toggle active status', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No schedules found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Schedule/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Schedule Name/i)).toBeInTheDocument();
    });

    // Active checkbox should be checked by default
    const activeCheckbox = screen.getByLabelText(/^Active$/i) as HTMLInputElement;
    expect(activeCheckbox.checked).toBe(true);

    // Uncheck it
    fireEvent.click(activeCheckbox);
    expect(activeCheckbox.checked).toBe(false);

    // Check it again
    fireEvent.click(activeCheckbox);
    expect(activeCheckbox.checked).toBe(true);
  });

  it('should set schedule as default', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No schedules found/i)).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText(/Create Schedule/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Schedule Name/i)).toBeInTheDocument();
    });

    // Check "Set as default"
    const defaultCheckbox = screen.getByLabelText(/Set as default/i);
    fireEvent.click(defaultCheckbox);

    expect((defaultCheckbox as HTMLInputElement).checked).toBe(true);
  });
});
