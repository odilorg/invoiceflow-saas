'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HelpBox from '@/components/HelpBox';
import UsageCounter from '@/components/UsageCounter';
import EntityListCard from '@/components/EntityListCard';
import { HELP_CONTENT } from '@/lib/help-content';
import {
  FormModalShell,
  FormSection,
  FormField,
  FormInput,
  FormSelect,
  FormActions,
  FormErrorBanner,
  FormCheckbox,
  useFormValidation,
} from '@/components/form';
import { validators } from '@/lib/ui/form-errors';
import type { FormSelectOption } from '@/components/form';

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
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadSchedules();
    loadUsage();
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

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
        showSuccess('Schedule deleted');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-sm text-muted-foreground">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Follow-up Schedules</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Schedule
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-foreground font-medium">Default schedule is used automatically for new invoices.</p>
          <p className="text-sm text-muted-foreground">You can still select a different schedule per invoice.</p>
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
        <div className="mb-4 bg-card border border-border rounded-lg p-4">
          <UsageCounter
            used={usage.schedules.used}
            limit={usage.schedules.limit}
            label="Schedules"
          />
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="bg-card rounded-lg p-8 lg:p-12 text-center border border-border">
          <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-base font-semibold text-foreground mb-1">No schedules found</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first schedule to automate follow-ups</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-foreground text-background text-sm rounded-lg hover:opacity-90 transition-colors font-medium"
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
                              <span className="text-xs text-muted-foreground truncate">
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
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-colors z-30"
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
            showSuccess('Schedule created');
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
            showSuccess('Schedule updated');
          }}
        />
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-foreground text-background px-4 py-3 rounded-lg shadow-lg text-sm">
            {successMessage}
          </div>
        </div>
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
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const { errors, isLoading, setLoading, handleApiError, clearAllErrors } = useFormValidation();

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
          handleApiError({ error: 'No email templates found. Please create templates first before creating a schedule.' });
        }
      } else {
        handleApiError({ error: 'Failed to load templates' });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      handleApiError({ error: 'Error loading templates. Please refresh and try again.' });
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
    clearAllErrors(); // Clear error when user makes changes
  };

  const handleSubmit = async () => {
    clearAllErrors();
    setUpgradeRequired(false);

    // Client-side validation
    if (!formData.name.trim()) {
      handleApiError({ error: 'Please enter a schedule name' });
      return;
    }

    // Validate steps array is not empty
    if (steps.length === 0) {
      handleApiError({ error: 'Please add at least one follow-up step' });
      return;
    }

    // Validate all steps have a template selected
    const emptyTemplates = steps.filter(s => !s.templateId || s.templateId === '');
    if (emptyTemplates.length > 0) {
      handleApiError({ error: `Please select a template for all follow-up steps. ${emptyTemplates.length} step(s) missing templates.` });
      return;
    }

    // Validate day offsets are valid numbers
    const invalidDays = steps.filter(s => isNaN(parseInt(s.dayOffset)));
    if (invalidDays.length > 0) {
      handleApiError({ error: 'Please enter valid numbers for days after due date' });
      return;
    }

    setLoading(true);

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
          handleApiError({ error: `Validation failed:\n${errorMessages}` });
        } else {
          handleApiError(data);
        }
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving schedule:', err);
      handleApiError({ error: 'An error occurred while saving. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const templateOptions: FormSelectOption[] = templates.map(t => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <FormModalShell
      title={schedule ? 'Edit Schedule' : 'Create Schedule'}
      description="Set up automated email reminders for overdue invoices"
      onClose={onClose}
      stickyFooter
    >
      {/* Error Banner */}
      <FormErrorBanner
        message={errors.serverError}
        upgradeMessage={upgradeRequired ? 'Upgrade your plan to create more schedules and unlock additional features.' : undefined}
      />

      {/* Upgrade Button */}
      {upgradeRequired && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/billing')}
            className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors"
          >
            View Plans
          </button>
        </div>
      )}

      <div className="space-y-6">
        <FormSection fullWidth>
          <FormField id="name" label="Schedule Name" required hint="Give your schedule a descriptive name">
            <FormInput
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              placeholder="e.g., Standard Follow-up"
              autoTrim
            />
          </FormField>

          <FormCheckbox
            id="isActive"
            label="Active"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            hint="Schedule will be used for new invoices"
            disabled={isLoading}
          />
        </FormSection>

        <FormSection fullWidth>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Follow-up Steps *
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define when each reminder should be sent
              </p>
            </div>
            <button
              type="button"
              onClick={addStep}
              className="px-3 py-1.5 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium disabled:opacity-50"
              disabled={isLoading || templatesLoading || templates.length === 0}
            >
              + Add Step
            </button>
          </div>

          {templatesLoading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-6 w-6 text-muted-foreground mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-center">
              <svg className="w-8 h-8 text-warning mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-warning font-medium">No email templates available</p>
              <p className="text-xs text-warning/80 mt-1">
                Please create email templates before setting up a schedule
              </p>
              <button
                type="button"
                onClick={() => window.location.href = '/dashboard/templates'}
                className="mt-3 px-4 py-2 bg-warning text-warning-foreground text-sm rounded-lg hover:bg-warning/90 transition-colors"
              >
                Go to Templates
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.length === 0 ? (
                <div className="text-center py-8 bg-muted/50 rounded-lg border-2 border-dashed border-border">
                  <p className="text-sm text-muted-foreground">No follow-up steps added yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Click "Add Step" to create your first reminder</p>
                </div>
              ) : (
                steps.map((step, index) => (
                  <div key={index} className="flex gap-2 items-start bg-muted/50 rounded-lg p-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <FormField
                        id={`step-${index}-dayOffset`}
                        label="Days after due date"
                        required
                        hint={
                          step.dayOffset === '0' ? 'On due date' :
                          parseInt(step.dayOffset) < 0 ? 'Before due date' :
                          parseInt(step.dayOffset) === 1 ? '1 day after' :
                          `${step.dayOffset} days after`
                        }
                      >
                        <FormInput
                          id={`step-${index}-dayOffset`}
                          type="number"
                          value={step.dayOffset}
                          onChange={(e) => updateStep(index, 'dayOffset', e.target.value)}
                          disabled={isLoading}
                          placeholder="e.g., 7"
                          min="-30"
                          max="365"
                        />
                      </FormField>

                      <FormField
                        id={`step-${index}-templateId`}
                        label="Template"
                        required
                        error={!step.templateId ? 'Required' : undefined}
                      >
                        <FormSelect
                          id={`step-${index}-templateId`}
                          value={step.templateId}
                          onChange={(e) => updateStep(index, 'templateId', e.target.value)}
                          options={[{ value: '', label: 'Select template' }, ...templateOptions]}
                          disabled={isLoading}
                          error={!step.templateId}
                        />
                      </FormField>
                    </div>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="mt-5 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                        disabled={isLoading}
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
            <div className="mt-3 bg-info/10 border border-info/30 rounded-lg p-3">
              <p className="text-xs text-info">
                💡 <strong>Tip:</strong> Common schedule: Day 0 (friendly), Day 7 (reminder), Day 14 (firm), Day 30 (final)
              </p>
            </div>
          )}
        </FormSection>

        <FormActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={schedule ? 'Update Schedule' : 'Create Schedule'}
          loading={isLoading}
          disabled={isLoading || templates.length === 0}
        />
      </div>
    </FormModalShell>
  );
}