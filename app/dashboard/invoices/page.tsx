'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HelpBox from '@/components/HelpBox';
import UsageCounter from '@/components/UsageCounter';
import EntityListCard from '@/components/EntityListCard';
import { HELP_CONTENT } from '@/lib/help-content';
import { getReminderState, getReminderStateDisplay } from '@/lib/reminder-state';

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-sm text-slate-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900">Invoices</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </button>
        </div>
        <p className="text-sm text-slate-600">Manage and track all your invoices</p>
      </div>

      {/* Help Box */}
      <HelpBox
        title={HELP_CONTENT.invoices.title}
        items={HELP_CONTENT.invoices.items}
        variant={HELP_CONTENT.invoices.variant}
      />

      {/* Usage Counter */}
      {usage && (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-4">
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
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-lg p-8 lg:p-12 text-center border border-slate-200">
          <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No invoices here yet.</h3>
          <p className="text-sm text-slate-600 mb-4">Create your first invoice to start automatic follow-ups.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Create invoice
          </button>
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
          <div className="hidden lg:block bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Follow-ups</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-900">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">{invoice.clientName}</div>
                        <div className="text-sm text-slate-500">{invoice.clientEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">
                        {invoice.currency} {invoice.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge invoice={invoice} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {invoice.followUps?.filter((f: any) => f.status === 'SENT').length || 0} /
                        {invoice.followUps?.length || 0} sent
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                          className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors font-medium"
                        >
                          View
                        </button>
                        {invoice.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setEditingInvoice(invoice);
                              setShowEditModal(true);
                            }}
                            className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors font-medium"
                          >
                            Edit
                          </button>
                        )}
                        {invoice.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 transition-colors z-30"
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
    PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    PAID: 'bg-green-50 text-green-700 border border-green-200',
    OVERDUE: 'bg-red-50 text-red-700 border border-red-200',
    CANCELLED: 'bg-slate-50 text-slate-700 border border-slate-200',
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
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Reminders done
          </span>
        )}
      </div>
      {isOverdue && daysOverdue > 0 && (
        <span className="text-xs text-red-600 font-medium">
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
    scheduleId: '', // Will use default schedule if empty
  });
  const [schedules, setSchedules] = useState<Array<{ id: string; name: string; isDefault: boolean; isActive: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) {
        const data = await res.json();
        // Only show active schedules
        const activeSchedules = data.filter((s: any) => s.isActive);
        setSchedules(activeSchedules);
        // Auto-select default schedule if exists
        const defaultSchedule = activeSchedules.find((s: any) => s.isDefault);
        if (defaultSchedule) {
          setFormData(prev => ({ ...prev, scheduleId: defaultSchedule.id }));
        }
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUpgradeRequired(false);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          dueDate: new Date(formData.dueDate).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create invoice');
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
        }
        return;
      }

      // Find the selected schedule name for confirmation
      const selectedSchedule = schedules.find(s => s.id === formData.scheduleId);
      const scheduleName = selectedSchedule?.name || 'Default schedule';

      // Show success message with schedule info
      alert(`Invoice created successfully!\nUsing schedule: ${scheduleName}`);

      onSuccess();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Create Invoice</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium mb-1">{error}</p>
                  {upgradeRequired && (
                    <p className="text-red-600 text-xs">
                      Upgrade your plan to create more invoices and unlock additional features.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Email *
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                placeholder="INV-001"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Amount *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Currency
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="UZS">UZS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Follow-up Schedule
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm bg-white"
                value={formData.scheduleId}
                onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
              >
                {schedules.length === 0 ? (
                  <option value="">No schedules available</option>
                ) : (
                  schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name}{schedule.isDefault ? ' (Default - used automatically)' : ''}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {schedules.find(s => s.id === formData.scheduleId)?.isDefault
                  ? 'This schedule will be used automatically for reminder emails'
                  : 'You have manually selected this schedule for this invoice'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes (optional - can be used for invoice link)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                rows={3}
                placeholder="https://invoice-link.com/inv-001"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Compute followUpsSentCount from invoice data
  const followUpsSentCount = invoice.followUps?.filter((f: any) => f.status === 'SENT').length || 0;
  const isLimitedEditMode = followUpsSentCount > 0;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        if (formData.clientEmail !== invoice.clientEmail) updatePayload.clientEmail = formData.clientEmail;
        if (formData.invoiceNumber !== invoice.invoiceNumber) updatePayload.invoiceNumber = formData.invoiceNumber;
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
        setError(data.error || 'Failed to update invoice');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Edit Invoice</h2>
          {isLimitedEditMode && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠️ Limited editing: {followUpsSentCount} reminder(s) sent. Only notes can be edited to preserve audit trail.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Name *
              </label>
              <input
                type="text"
                required
                disabled={isLimitedEditMode}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                title={isLimitedEditMode ? 'Cannot edit after reminders sent' : ''}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Email *
              </label>
              <input
                type="email"
                required
                disabled={isLimitedEditMode}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                title={isLimitedEditMode ? 'Cannot edit after reminders sent' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                disabled={isLimitedEditMode}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder="INV-001"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                title={isLimitedEditMode ? 'Cannot edit after reminders sent' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Amount *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                disabled={isLimitedEditMode}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                title={isLimitedEditMode ? 'Cannot edit after reminders sent' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Currency
              </label>
              <select
                disabled={isLimitedEditMode}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                title={isLimitedEditMode ? 'Cannot edit after reminders sent' : ''}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="UZS">UZS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                required
                disabled={isLimitedEditMode}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                title={isLimitedEditMode ? 'Cannot edit after reminders sent' : ''}
              />
            </div>

            {!isLimitedEditMode && schedules.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Follow-up Schedule
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm bg-white"
                  value={formData.scheduleId}
                  onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
                >
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name}{schedule.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Change the reminder schedule for this invoice. Only available before reminders are sent.
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes (optional - can be used for invoice link)
                {!isLimitedEditMode && <span className="text-slate-500 font-normal"> - Always editable</span>}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                rows={3}
                placeholder="https://invoice-link.com/inv-001"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
