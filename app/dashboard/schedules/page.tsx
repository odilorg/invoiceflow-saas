'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HelpBox from '@/components/HelpBox';
import UsageCounter from '@/components/UsageCounter';
import EntityListCard from '@/components/EntityListCard';
import { HELP_CONTENT } from '@/lib/help-content';

interface Schedule {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  steps: ScheduleStep[];
}

interface ScheduleStep {
  id: string;
  dayOffset: number;
  templateId: string;
  template?: {
    id: string;
    name: string;
  };
}

interface Template {
  id: string;
  name: string;
}

interface UsageStats {
  schedules: { used: number; limit: number | null };
  plan: string;
}

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    loadSchedules();
    loadUsage();
  }, []);

  async function loadSchedules() {
    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load schedules');
      }
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsage() {
    try {
      const res = await fetch('/api/billing/usage');
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  }

  const handleDelete = async (id: string, schedule: Schedule) => {
    // Check if this is the default schedule
    if (schedule.isDefault) {
      alert('Cannot delete the default schedule. Please set another schedule as default first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this schedule? This will not affect existing follow-ups, but new invoices will not use this schedule.')) return;

    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to delete schedule');
      } else {
        loadSchedules();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-sm text-slate-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900">Follow-up Schedules</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Schedule
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-slate-900 font-medium">Default schedule is used automatically for new invoices.</p>
          <p className="text-sm text-slate-600">You can still select a different schedule per invoice.</p>
        </div>
      </div>

      {/* Help Box */}
      <HelpBox
        title={HELP_CONTENT.schedules.title}
        items={HELP_CONTENT.schedules.items}
        variant={HELP_CONTENT.schedules.variant}
      />

      {/* Usage Counter */}
      {usage && (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-4">
          <UsageCounter
            used={usage.schedules.used}
            limit={usage.schedules.limit}
            label="Schedules"
          />
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg p-8 lg:p-12 text-center border border-slate-200">
          <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No schedules found</h3>
          <p className="text-sm text-slate-600 mb-4">Create your first schedule to automate follow-ups</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {schedules.map((schedule) => {
            const sortedSteps = schedule.steps
              ? [...schedule.steps].sort((a, b) => a.dayOffset - b.dayOffset)
              : [];

            return (
              <EntityListCard
                key={schedule.id}
                title={schedule.name}
                subtitle={
                  sortedSteps.length > 0
                    ? `${sortedSteps.length} reminder${sortedSteps.length !== 1 ? 's' : ''} configured`
                    : 'No reminders configured'
                }
                badge={{
                  label: schedule.isDefault ? 'Default' : schedule.isActive ? 'Available' : 'Unavailable',
                  variant: schedule.isDefault ? 'info' : schedule.isActive ? 'success' : 'neutral',
                }}
                fields={
                  sortedSteps.length > 0
                    ? sortedSteps.map((step, index) => ({
                        label: `Step ${index + 1}`,
                        value: (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                              {step.dayOffset === 0
                                ? 'On due date'
                                : `${step.dayOffset} day${step.dayOffset !== 1 ? 's' : ''} after`}
                            </span>
                            {step.template && (
                              <span className="text-xs text-slate-600 truncate">
                                {step.template.name}
                              </span>
                            )}
                          </div>
                        ),
                      }))
                    : []
                }
                primaryAction={{
                  label: 'Edit Schedule',
                  onClick: () => setEditingSchedule(schedule),
                  variant: 'secondary',
                }}
                destructiveAction={
                  !schedule.isDefault
                    ? {
                        icon: (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        ),
                        onClick: () => handleDelete(schedule.id, schedule),
                        ariaLabel: 'Delete schedule',
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 transition-colors z-30"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showCreateModal && (
        <ScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSchedules();
          }}
        />
      )}

      {editingSchedule && (
        <ScheduleModal
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSuccess={() => {
            setEditingSchedule(null);
            loadSchedules();
          }}
        />
      )}
    </div>
  );
}

function ScheduleModal({
  schedule,
  onClose,
  onSuccess,
}: {
  schedule?: Schedule;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    isActive: schedule?.isActive ?? true,
  });
  const [steps, setSteps] = useState<{ dayOffset: string; templateId: string }[]>(
    schedule?.steps?.map((s) => ({ dayOffset: s.dayOffset.toString(), templateId: s.templateId })) || [
      { dayOffset: '0', templateId: '' },
    ]
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);

        // If no templates exist, show warning
        if (data.length === 0) {
          setError('No email templates found. Please create templates first before creating a schedule.');
        }
      } else {
        setError('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Error loading templates. Please refresh and try again.');
    } finally {
      setTemplatesLoading(false);
    }
  }

  const addStep = () => {
    setSteps([...steps, { dayOffset: '0', templateId: '' }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: 'dayOffset' | 'templateId', value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
    setError(''); // Clear error when user makes changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUpgradeRequired(false);

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Please enter a schedule name');
      setLoading(false);
      return;
    }

    // Validate steps array is not empty
    if (steps.length === 0) {
      setError('Please add at least one follow-up step');
      setLoading(false);
      return;
    }

    // Validate all steps have a template selected
    const emptyTemplates = steps.filter(s => !s.templateId || s.templateId === '');
    if (emptyTemplates.length > 0) {
      setError(`Please select a template for all follow-up steps. ${emptyTemplates.length} step(s) missing templates.`);
      setLoading(false);
      return;
    }

    // Validate day offsets are valid numbers
    const invalidDays = steps.filter(s => isNaN(parseInt(s.dayOffset)));
    if (invalidDays.length > 0) {
      setError('Please enter valid numbers for days after due date');
      setLoading(false);
      return;
    }

    try {
      const url = schedule ? `/api/schedules/${schedule.id}` : '/api/schedules';
      const method = schedule ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        steps: steps.map((s, index) => ({
          dayOffset: parseInt(s.dayOffset),
          templateId: s.templateId,
          order: index,
        })),
      };

      console.log('[Schedule Form] Sending payload:', payload);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if upgrade is required
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
        }
        // Show detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details
            .map((d: any) => {
              const field = d.path.join('.') || 'Field';
              return `• ${field}: ${d.message}`;
            })
            .join('\n');
          setError(`Validation failed:\n${errorMessages}`);
        } else {
          setError(data.error || 'Failed to save schedule');
        }
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('An error occurred while saving. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {schedule ? 'Edit Schedule' : 'Create Schedule'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Set up automated email reminders for overdue invoices
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 whitespace-pre-line">
                  <p className="font-medium mb-1">{error}</p>
                  {upgradeRequired && (
                    <p className="text-red-600 text-xs">
                      Upgrade your plan to create more schedules and unlock additional features.
                    </p>
                  )}
                </div>
                {upgradeRequired && (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/billing')}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    View Plans
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Schedule Name *
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Standard Follow-up"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">
              Give your schedule a descriptive name
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
              disabled={loading}
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Active
            </label>
            <span className="text-xs text-slate-500">(Schedule will be used for new invoices)</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Follow-up Steps *
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define when each reminder should be sent
                </p>
              </div>
              <button
                type="button"
                onClick={addStep}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
                disabled={loading || templatesLoading || templates.length === 0}
              >
                + Add Step
              </button>
            </div>

            {templatesLoading ? (
              <div className="text-center py-8">
                <svg className="animate-spin h-6 w-6 text-slate-400 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-slate-500">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <svg className="w-8 h-8 text-amber-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-800 font-medium">No email templates available</p>
                <p className="text-xs text-amber-700 mt-1">
                  Please create email templates before setting up a schedule
                </p>
                <button
                  type="button"
                  onClick={() => window.location.href = '/dashboard/templates'}
                  className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Go to Templates
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">No follow-up steps added yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Step" to create your first reminder</p>
                  </div>
                ) : (
                  steps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-start bg-slate-50 rounded-lg p-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1 font-medium">
                            Days after due date *
                          </label>
                          <input
                            type="number"
                            required
                            min="-30"
                            max="365"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm bg-white"
                            value={step.dayOffset}
                            onChange={(e) => updateStep(index, 'dayOffset', e.target.value)}
                            placeholder="e.g., 7"
                            disabled={loading}
                          />
                          <p className="text-xs text-slate-500 mt-0.5">
                            {step.dayOffset === '0' ? 'On due date' :
                             parseInt(step.dayOffset) < 0 ? 'Before due date' :
                             parseInt(step.dayOffset) === 1 ? '1 day after' :
                             `${step.dayOffset} days after`}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1 font-medium">
                            Template *
                          </label>
                          <select
                            required
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm bg-white ${
                              !step.templateId ? 'border-amber-300' : 'border-slate-200'
                            }`}
                            value={step.templateId}
                            onChange={(e) => updateStep(index, 'templateId', e.target.value)}
                            disabled={loading}
                          >
                            <option value="">Select template</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                          {!step.templateId && (
                            <p className="text-xs text-amber-600 mt-0.5">Required</p>
                          )}
                        </div>
                      </div>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="mt-5 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          disabled={loading}
                          title="Remove step"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {steps.length > 0 && templates.length > 0 && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Common schedule: Day 0 (friendly), Day 7 (reminder), Day 14 (firm), Day 30 (final)
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || templates.length === 0}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}