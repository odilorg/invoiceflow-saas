'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getReminderState, getReminderStatusMessage, isReminderExhausted } from '@/lib/reminder-state';

interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  followUps?: FollowUp[];
  lastReminderSentAt?: string | null;
  totalScheduledReminders?: number | null;
  remindersCompleted?: boolean;
  remindersEnabled?: boolean;
  remindersBaseDueDate?: string | null;
  remindersResetAt?: string | null;
  remindersPausedReason?: string | null;
}

interface FollowUp {
  id: string;
  subject: string;
  body: string;
  scheduledDate: string;
  status: 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED';
  sentAt?: string;
  errorMessage?: string;
  logs?: EmailLog[];
}

interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  success: boolean;
  errorMessage?: string;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    invoiceNumber: '',
    amount: '',
    currency: 'USD',
    dueDate: '',
    notes: '',
    status: 'PENDING' as Invoice['status'],
  });

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  async function loadInvoice() {
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 404) {
          router.push('/dashboard/invoices');
          return;
        }
        throw new Error('Failed to load invoice');
      }
      const data = await res.json();
      setInvoice(data);
      setFormData({
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount.toString(),
        currency: data.currency,
        dueDate: new Date(data.dueDate).toISOString().split('T')[0],
        notes: data.notes || '',
        status: data.status,
      });
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if due date changed and invoice is overdue or reminders completed
    if (invoice) {
      const oldDueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
      const newDueDate = formData.dueDate;
      const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
      const remindersCompleted = invoice.remindersCompleted;

      if (oldDueDate !== newDueDate && (isOverdue || remindersCompleted)) {
        // Show reminder restart modal
        setPendingFormData({
          ...formData,
          amount: parseFloat(formData.amount),
          dueDate: new Date(formData.dueDate).toISOString(),
        });
        setShowReminderModal(true);
        return;
      }
    }

    // Proceed with normal update
    await performUpdate();
  };

  const performUpdate = async (restartReminders?: boolean) => {
    try {
      const updateData = pendingFormData || {
        ...formData,
        amount: parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate).toISOString(),
      };

      const res = await fetch(`/api/invoices/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updateData,
          restartReminders,
        }),
      });

      if (res.ok) {
        setEditing(false);
        setShowReminderModal(false);
        setPendingFormData(null);
        loadInvoice();
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/dashboard/invoices')}
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
            >
              ← Back to Invoices
            </button>
            <div className="flex gap-2">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Reminder Status Banners */}
      {/* Reminders Paused Banner */}
      {invoice && !invoice.remindersEnabled && invoice.remindersPausedReason === 'user_updated_date_no_restart' && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Reminders paused</h3>
                <p className="text-sm text-blue-800">
                  Reminders are paused for this invoice. No further emails will be sent unless you restart reminders.
                </p>
                <button
                  onClick={() => {
                    // Restart reminders
                    fetch(`/api/invoices/${params.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        restartReminders: true,
                        dueDate: invoice.dueDate,
                      }),
                    }).then(() => loadInvoice());
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Restart reminders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminders Restarted Banner */}
      {invoice && invoice.remindersResetAt && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-green-800">
                  Reminders restarted on {new Date(invoice.remindersResetAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} using new due date {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminders Completed Banner */}
      {invoice && isReminderExhausted({
        ...invoice,
        remindersCompleted: invoice.remindersCompleted || false,
        lastReminderSentAt: invoice.lastReminderSentAt ? new Date(invoice.lastReminderSentAt) : null,
        totalScheduledReminders: invoice.totalScheduledReminders
      }) && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">Reminders completed</h3>
                <p className="text-sm text-amber-800">
                  {getReminderStatusMessage({
                    ...invoice,
                    remindersCompleted: invoice.remindersCompleted || false,
                    lastReminderSentAt: invoice.lastReminderSentAt ? new Date(invoice.lastReminderSentAt) : null,
                    totalScheduledReminders: invoice.totalScheduledReminders
                  })}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {invoice.notes && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(invoice.notes || '');
                        // You could add a toast notification here
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-sm rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy invoice link
                    </button>
                  )}
                  <Link
                    href={`/dashboard/activity?invoice=${invoice.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-sm rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Email Activity
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Invoice Details</h1>
                <StatusBadge status={invoice.status} isOverdue={isOverdue} />
              </div>

              {editing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Client Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Client Email</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Number</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                      <select
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                      <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                      <select
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                      <textarea
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <DetailRow label="Invoice Number" value={invoice.invoiceNumber} mono />
                  <DetailRow label="Client Name" value={invoice.clientName} />
                  <DetailRow label="Client Email" value={invoice.clientEmail} />
                  <DetailRow
                    label="Amount"
                    value={`${invoice.currency} ${invoice.amount.toLocaleString()}`}
                  />
                  <DetailRow
                    label="Due Date"
                    value={new Date(invoice.dueDate).toLocaleDateString()}
                  />
                  <DetailRow
                    label="Created"
                    value={new Date(invoice.createdAt).toLocaleDateString()}
                  />
                  {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
                </div>
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Follow-ups</h2>
              {invoice.followUps && invoice.followUps.length > 0 ? (
                <div className="space-y-3">
                  {invoice.followUps.map((followUp) => (
                    <div key={followUp.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-900">
                          {new Date(followUp.scheduledDate).toLocaleDateString()}
                        </span>
                        <FollowUpStatusBadge status={followUp.status} />
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{followUp.subject}</p>
                      {followUp.sentAt && (
                        <p className="text-xs text-slate-500">
                          Sent: {new Date(followUp.sentAt).toLocaleString()}
                        </p>
                      )}
                      {followUp.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">{followUp.errorMessage}</p>
                      )}
                      {followUp.logs && followUp.logs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-xs text-slate-500">
                            {followUp.logs.length} email log{followUp.logs.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No follow-ups scheduled</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Restart Modal */}
      {showReminderModal && invoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Restart reminders?</h3>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-600">
                You changed the due date from{' '}
                <span className="font-medium">
                  {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {new Date(formData.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>.
              </p>
              <p className="text-sm text-slate-600">
                Do you want InvoiceFlow to restart reminder emails based on the new due date?
              </p>
              <p className="text-xs text-slate-500 italic">
                Previous email activity will remain in the log.
              </p>
              {new Date(formData.dueDate) < new Date() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs text-amber-800">
                      <strong>Warning:</strong> New due date is in the past. Reminders may send immediately if you restart.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => performUpdate(true)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Restart reminders
              </button>
              <button
                onClick={() => performUpdate(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Update date only
              </button>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setPendingFormData(null);
                }}
                className="px-4 py-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className={`text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  const actualStatus = isOverdue ? 'OVERDUE' : status;
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-slate-100 text-slate-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[actualStatus as keyof typeof colors]}`}>
      {actualStatus}
    </span>
  );
}

function FollowUpStatusBadge({ status }: { status: string }) {
  const colors = {
    PENDING: 'bg-blue-100 text-blue-800',
    SENT: 'bg-green-100 text-green-800',
    SKIPPED: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status as keyof typeof colors]}`}>
      {status}
    </span>
  );
}
