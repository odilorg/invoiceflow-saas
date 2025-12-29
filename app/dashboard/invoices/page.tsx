'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HelpBox from '@/components/HelpBox';
import UsageCounter from '@/components/UsageCounter';
import EntityListCard from '@/components/EntityListCard';
import { HELP_CONTENT } from '@/lib/help-content';
import { getReminderState, getReminderStateDisplay } from '@/lib/reminder-state';
import {
  FormModalShell,
  FormSection,
  FormField,
  FormInput,
  FormAmountInput,
  FormSelect,
  FormDateInput,
  FormTextarea,
  FormActions,
  FormErrorBanner,
  useFormValidation,
} from '@/components/form';
import { validators } from '@/lib/ui/form-errors';
import { normalizeEmail, normalizeInvoiceNumber, normalizeFormData } from '@/lib/ui/input-normalize';
import type { FormSelectOption } from '@/components/form';

interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string | null;
  scheduleId?: string | null;
  createdAt: string;
  followUps?: any[];
  lastReminderSentAt?: string | null;
  totalScheduledReminders?: number | null;
  remindersCompleted?: boolean;
}

interface UsageStats {
  invoices: { used: number; limit: number | null };
  plan: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
    loadUsage();
  }, []);

  async function loadInvoices() {
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load invoices');
      }
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
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

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') {
      return invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
    }
    return invoice.status === filter.toUpperCase();
  });

  const handleMarkAsPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });
      if (res.ok) {
        loadInvoices();
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadInvoices();
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  // Helper to get badge variant from invoice status
  const getBadgeVariant = (invoice: Invoice): 'success' | 'warning' | 'danger' | 'neutral' => {
    const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
    if (isOverdue) return 'danger';
    if (invoice.status === 'PAID') return 'success';
    if (invoice.status === 'PENDING') return 'warning';
    return 'neutral';
  };

  const getBadgeLabel = (invoice: Invoice): string => {
    const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
    if (isOverdue) {
      const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return `OVERDUE (${daysOverdue}d)`;
    }
    return invoice.status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-sm text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Invoices</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Manage and track all your invoices</p>
      </div>

      {/* Help Box */}
      <HelpBox
        title={HELP_CONTENT.invoices.title}
        items={HELP_CONTENT.invoices.items}
        variant={HELP_CONTENT.invoices.variant}
      />

      {/* Usage Counter */}
      {usage && (
        <div className="mb-4 bg-card border border-border rounded-lg p-4">
          <UsageCounter
            used={usage.invoices.used}
            limit={usage.invoices.limit}
            label="Invoices this month"
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'pending', 'paid', 'overdue'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === f
                ? 'bg-foreground text-background'
                : 'bg-card text-foreground hover:bg-muted border border-border'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-card rounded-lg p-8 lg:p-12 text-center border border-border">
          <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {invoices.length === 0 ? (
            <>
              <h3 className="text-base font-semibold text-foreground mb-1">No invoices yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first invoice to start sending automatic reminders.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-foreground text-background text-sm rounded-lg hover:opacity-90 transition-colors font-medium"
              >
                Create Invoice
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-foreground mb-1">No {filter} invoices</h3>
              <p className="text-sm text-muted-foreground mb-4">Try selecting a different filter or create a new invoice.</p>
              <button
                onClick={() => setFilter('all')}
                className="px-5 py-2.5 bg-card text-foreground border border-border text-sm rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Show All Invoices
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card Layout - EntityListCard */}
          <div className="lg:hidden space-y-4 pb-24">
            {filteredInvoices.map((invoice) => (
              <EntityListCard
                key={invoice.id}
                title={invoice.invoiceNumber}
                subtitle={`${invoice.clientName} • ${invoice.clientEmail}`}
                badge={{
                  label: getBadgeLabel(invoice),
                  variant: getBadgeVariant(invoice),
                }}
                fields={[
                  {
                    label: 'Amount',
                    value: `${invoice.currency} ${invoice.amount.toLocaleString()}`,
                  },
                  {
                    label: 'Due Date',
                    value: new Date(invoice.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                  },
                ]}
                primaryAction={{
                  label: 'View Details',
                  onClick: () => router.push(`/dashboard/invoices/${invoice.id}`),
                  variant: 'secondary',
                }}
                secondaryActions={[
                  {
                    label: 'Edit',
                    onClick: () => {
                      setEditingInvoice(invoice);
                      setShowEditModal(true);
                    },
                    hidden: invoice.status === 'PAID',
                  },
                  {
                    label: 'Mark Paid',
                    onClick: () => handleMarkAsPaid(invoice.id),
                    hidden: invoice.status !== 'PENDING',
                  },
                ]}
                destructiveAction={{
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ),
                  onClick: () => handleDelete(invoice.id),
                  ariaLabel: 'Delete invoice',
                }}
              />
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Follow-ups</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-foreground">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-foreground">{invoice.clientName}</div>
                        <div className="text-sm text-muted-foreground">{invoice.clientEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">
                        {invoice.currency} {invoice.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge invoice={invoice} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {invoice.followUps?.filter((f: any) => f.status === 'SENT').length || 0} /
                        {invoice.followUps?.length || 0} sent
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                          className="px-3 py-1.5 text-sm text-foreground hover:bg-muted rounded transition-colors font-medium"
                        >
                          View
                        </button>
                        {invoice.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setEditingInvoice(invoice);
                              setShowEditModal(true);
                            }}
                            className="px-3 py-1.5 text-sm text-foreground hover:bg-muted rounded transition-colors font-medium"
                          >
                            Edit
                          </button>
                        )}
                        {invoice.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            disabled={markingPaidId === invoice.id}
                            className="px-3 py-1.5 text-sm text-white bg-success hover:opacity-90 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                          >
                            {markingPaidId === invoice.id ? (
                              <>
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                              </>
                            ) : (
                              'Mark Paid'
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="Delete invoice"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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

      {/* Create Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadInvoices();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          onClose={() => {
            setShowEditModal(false);
            setEditingInvoice(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingInvoice(null);
            loadInvoices();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ invoice }: { invoice: Invoice }) {
  const { status, dueDate } = invoice;
  const isOverdue = status === 'PENDING' && new Date(dueDate) < new Date();
  const actualStatus = isOverdue ? 'OVERDUE' : status;

  const colors = {
    PENDING: 'bg-warning/10 text-warning border border-warning/20',
    PAID: 'bg-success/10 text-success border border-success/20',
    OVERDUE: 'bg-destructive/10 text-destructive border border-destructive/20',
    CANCELLED: 'bg-background text-foreground border border-border',
  };

  // Calculate days overdue
  const daysOverdue = isOverdue
    ? Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get reminder state
  const reminderState = getReminderState({
    status: invoice.status,
    remindersCompleted: invoice.remindersCompleted || false,
    lastReminderSentAt: invoice.lastReminderSentAt ? new Date(invoice.lastReminderSentAt) : null,
    totalScheduledReminders: invoice.totalScheduledReminders,
    followUps: invoice.followUps,
  });

  const reminderDisplay = getReminderStateDisplay(reminderState);

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[actualStatus as keyof typeof colors]}`}>
          {actualStatus}
        </span>
        {reminderState === 'COMPLETED' && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
            Reminders done
          </span>
        )}
      </div>
      {isOverdue && daysOverdue > 0 && (
        <span className="text-xs text-destructive font-medium">
          {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
          {reminderState === 'COMPLETED' && ' • No more reminders'}
        </span>
      )}
    </div>
  );
}

function CreateInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    invoiceNumber: '',
    amount: '',
    currency: 'USD',
    dueDate: '',
    notes: '',
    scheduleId: '',
  });
  const [schedules, setSchedules] = useState<Array<{ id: string; name: string; isDefault: boolean; isActive: boolean }>>([]);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const { errors, isLoading, setLoading, validateOnSubmit, handleApiError, clearAllErrors, hasFormErrors } = useFormValidation();

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) {
        const data = await res.json();
        const activeSchedules = data.filter((s: any) => s.isActive);
        setSchedules(activeSchedules);
        const defaultSchedule = activeSchedules.find((s: any) => s.isDefault);
        if (defaultSchedule) {
          setFormData(prev => ({ ...prev, scheduleId: defaultSchedule.id }));
        }
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    clearAllErrors();
    setUpgradeRequired(false);

    // Validate
    const validationSchema = {
      clientName: [validators.required('Client name')],
      clientEmail: [validators.required('Client email'), validators.email()],
      invoiceNumber: [validators.required('Invoice number')],
      amount: [
        validators.required('Amount'),
        validators.custom((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be a positive number'),
      ],
      currency: [validators.required('Currency')],
      dueDate: [validators.required('Due date')],
      notes: [],
      scheduleId: [],
    };

    const validationErrors = validateOnSubmit(formData, validationSchema);
    if (hasFormErrors()) return;

    // Normalize data
    const normalized = normalizeFormData(formData, {
      clientEmail: normalizeEmail,
      invoiceNumber: normalizeInvoiceNumber,
    });

    setLoading(true);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...normalized,
          amount: parseFloat(normalized.amount),
          dueDate: new Date(normalized.dueDate).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        handleApiError(data);
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
        }
        return;
      }

      const selectedSchedule = schedules.find(s => s.id === normalized.scheduleId);
      const scheduleName = selectedSchedule?.name || 'Default schedule';
      alert(`Invoice created successfully!\nUsing schedule: ${scheduleName}`);

      onSuccess();
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const currencyOptions: FormSelectOption[] = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
    { value: 'UZS', label: 'UZS' },
  ];

  const scheduleOptions: FormSelectOption[] = schedules.length === 0
    ? [{ value: '', label: 'No schedules available' }]
    : schedules.map(s => ({
        value: s.id,
        label: `${s.name}${s.isDefault ? ' (Default - used automatically)' : ''}`,
      }));

  const selectedSchedule = schedules.find(s => s.id === formData.scheduleId);

  return (
    <FormModalShell
      title="Create Invoice"
      description="Create a new invoice and set up automatic follow-up reminders"
      onClose={onClose}
      stickyFooter
    >
      {/* Error Banner */}
      <FormErrorBanner
        message={errors.serverError}
        upgradeMessage={upgradeRequired ? 'Upgrade your plan to create more invoices and unlock additional features.' : undefined}
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

      {/* Form Sections */}
      <div className="space-y-6">
        <FormSection title="Client Information">
          <FormField id="clientName" label="Client Name" required error={errors.fieldErrors.clientName}>
            <FormInput
              id="clientName"
              type="text"
              value={formData.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              error={!!errors.fieldErrors.clientName}
              disabled={isLoading}
              autoComplete="name"
              autoTrim
            />
          </FormField>

          <FormField id="clientEmail" label="Client Email" required error={errors.fieldErrors.clientEmail}>
            <FormInput
              id="clientEmail"
              type="email"
              value={formData.clientEmail}
              onChange={(e) => handleChange('clientEmail', e.target.value)}
              error={!!errors.fieldErrors.clientEmail}
              disabled={isLoading}
              autoTrim
            />
          </FormField>
        </FormSection>

        <FormSection title="Invoice Details">
          <FormField id="invoiceNumber" label="Invoice Number" required error={errors.fieldErrors.invoiceNumber} hint="e.g., INV-001">
            <FormInput
              id="invoiceNumber"
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => handleChange('invoiceNumber', e.target.value)}
              error={!!errors.fieldErrors.invoiceNumber}
              disabled={isLoading}
              placeholder="INV-001"
              autoTrim
            />
          </FormField>

          <FormField id="amount" label="Amount" required error={errors.fieldErrors.amount}>
            <FormAmountInput
              id="amount"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              error={!!errors.fieldErrors.amount}
              disabled={isLoading}
              currency={formData.currency}
            />
          </FormField>

          <FormField id="currency" label="Currency" error={errors.fieldErrors.currency}>
            <FormSelect
              id="currency"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              options={currencyOptions}
              error={!!errors.fieldErrors.currency}
              disabled={isLoading}
            />
          </FormField>

          <FormField id="dueDate" label="Due Date" required error={errors.fieldErrors.dueDate}>
            <FormDateInput
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              error={!!errors.fieldErrors.dueDate}
              disabled={isLoading}
              min={new Date()}
            />
          </FormField>
        </FormSection>

        <FormSection fullWidth>
          <FormField
            id="scheduleId"
            label="Follow-up Schedule"
            hint={selectedSchedule?.isDefault ? 'This schedule will be used automatically for reminder emails' : 'You have manually selected this schedule for this invoice'}
          >
            <FormSelect
              id="scheduleId"
              value={formData.scheduleId}
              onChange={(e) => handleChange('scheduleId', e.target.value)}
              options={scheduleOptions}
              disabled={isLoading}
            />
          </FormField>

          <FormField id="notes" label="Notes" hint="Optional - can be used for invoice link">
            <FormTextarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              disabled={isLoading}
              placeholder="https://invoice-link.com/inv-001"
              rows={3}
            />
          </FormField>
        </FormSection>

        <FormActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Create Invoice"
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </FormModalShell>
  );
}

function EditInvoiceModal({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    notes: invoice.notes || '',
    scheduleId: invoice.scheduleId || '',
  });
  const [schedules, setSchedules] = useState<Array<{ id: string; name: string; isDefault: boolean; isActive: boolean }>>([]);

  const { errors, isLoading, setLoading, handleApiError, clearAllErrors } = useFormValidation();

  // Compute followUpsSentCount from invoice data
  const followUpsSentCount = invoice.followUps?.filter((f: any) => f.status === 'SENT').length || 0;
  const isLimitedEditMode = followUpsSentCount > 0;
  const lockedReason = isLimitedEditMode ? `Cannot edit after ${followUpsSentCount} reminder(s) sent` : undefined;

  useEffect(() => {
    if (!isLimitedEditMode) {
      loadSchedules();
    }
  }, [isLimitedEditMode]);

  async function loadSchedules() {
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) {
        const data = await res.json();
        const activeSchedules = data.filter((s: any) => s.isActive);
        setSchedules(activeSchedules);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    clearAllErrors();
    setLoading(true);

    try {
      const updatePayload: any = {};

      // In LIMITED mode, only send notes
      if (isLimitedEditMode) {
        if (formData.notes !== (invoice.notes || '')) {
          updatePayload.notes = formData.notes;
        }
      } else {
        // FULL EDIT mode: send all changed fields including scheduleId
        if (formData.clientName !== invoice.clientName) updatePayload.clientName = formData.clientName;
        if (formData.clientEmail !== invoice.clientEmail) updatePayload.clientEmail = normalizeEmail(formData.clientEmail);
        if (formData.invoiceNumber !== invoice.invoiceNumber) updatePayload.invoiceNumber = normalizeInvoiceNumber(formData.invoiceNumber);
        if (parseFloat(formData.amount) !== invoice.amount) updatePayload.amount = parseFloat(formData.amount);
        if (formData.currency !== invoice.currency) updatePayload.currency = formData.currency;
        if (formData.dueDate !== new Date(invoice.dueDate).toISOString().split('T')[0]) {
          updatePayload.dueDate = new Date(formData.dueDate).toISOString();
        }
        if (formData.notes !== (invoice.notes || '')) updatePayload.notes = formData.notes;
        if (formData.scheduleId !== (invoice.scheduleId || '')) updatePayload.scheduleId = formData.scheduleId;
      }

      // If no changes, just close
      if (Object.keys(updatePayload).length === 0) {
        onSuccess();
        return;
      }

      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();

      if (!res.ok) {
        handleApiError(data);
        return;
      }

      onSuccess();
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const currencyOptions: FormSelectOption[] = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
    { value: 'UZS', label: 'UZS' },
  ];

  const scheduleOptions: FormSelectOption[] = schedules.map(s => ({
    value: s.id,
    label: `${s.name}${s.isDefault ? ' (Default)' : ''}`,
  }));

  return (
    <FormModalShell
      title="Edit Invoice"
      description={isLimitedEditMode ? `⚠️ Limited editing: ${followUpsSentCount} reminder(s) sent. Only notes can be edited to preserve audit trail.` : 'Update invoice details and settings'}
      onClose={onClose}
      stickyFooter
    >
      {/* Error Banner */}
      <FormErrorBanner message={errors.serverError} />

      {/* Form Sections */}
      <div className="space-y-6">
        <FormSection title="Client Information">
          <FormField id="clientName" label="Client Name" required lockedReason={lockedReason}>
            <FormInput
              id="clientName"
              type="text"
              value={formData.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              disabled={isLimitedEditMode || isLoading}
              autoComplete="name"
              autoTrim
            />
          </FormField>

          <FormField id="clientEmail" label="Client Email" required lockedReason={lockedReason}>
            <FormInput
              id="clientEmail"
              type="email"
              value={formData.clientEmail}
              onChange={(e) => handleChange('clientEmail', e.target.value)}
              disabled={isLimitedEditMode || isLoading}
              autoTrim
            />
          </FormField>
        </FormSection>

        <FormSection title="Invoice Details">
          <FormField id="invoiceNumber" label="Invoice Number" required hint="e.g., INV-001" lockedReason={lockedReason}>
            <FormInput
              id="invoiceNumber"
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => handleChange('invoiceNumber', e.target.value)}
              disabled={isLimitedEditMode || isLoading}
              placeholder="INV-001"
              autoTrim
            />
          </FormField>

          <FormField id="amount" label="Amount" required lockedReason={lockedReason}>
            <FormAmountInput
              id="amount"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              disabled={isLimitedEditMode || isLoading}
              currency={formData.currency}
            />
          </FormField>

          <FormField id="currency" label="Currency" lockedReason={lockedReason}>
            <FormSelect
              id="currency"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              options={currencyOptions}
              disabled={isLimitedEditMode || isLoading}
            />
          </FormField>

          <FormField id="dueDate" label="Due Date" required lockedReason={lockedReason}>
            <FormDateInput
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              disabled={isLimitedEditMode || isLoading}
            />
          </FormField>
        </FormSection>

        {!isLimitedEditMode && schedules.length > 0 && (
          <FormSection fullWidth>
            <FormField id="scheduleId" label="Follow-up Schedule" hint="Change the reminder schedule for this invoice. Only available before reminders are sent.">
              <FormSelect
                id="scheduleId"
                value={formData.scheduleId}
                onChange={(e) => handleChange('scheduleId', e.target.value)}
                options={scheduleOptions}
                disabled={isLoading}
              />
            </FormField>
          </FormSection>
        )}

        <FormSection fullWidth>
          <FormField id="notes" label="Notes" hint={isLimitedEditMode ? 'Only editable field after reminders sent' : 'Optional - can be used for invoice link'}>
            <FormTextarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              disabled={isLoading}
              placeholder="https://invoice-link.com/inv-001"
              rows={3}
            />
          </FormField>
        </FormSection>

        <FormActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </FormModalShell>
  );
}
