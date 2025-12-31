'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getReminderState, getReminderStatusMessage, isReminderExhausted } from '@/lib/reminder-state';
import { FormSection, FormField, FormInput, FormSelect, FormTextarea, FormAmountInput, FormDateInput } from '@/components/form';

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
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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

  // Handle success banner on creation
  useEffect(() => {
    if (searchParams.get('created') === '1') {
      setShowSuccessBanner(true);
      // Remove query param from URL without reload
      window.history.replaceState({}, '', `/dashboard/invoices/${params.id}`);
      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => setShowSuccessBanner(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, params.id]);

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
      const response = await res.json();
      const data = response.data || response;
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

    if (invoice) {
      const oldDueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
      const newDueDate = formData.dueDate;
      const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
      const remindersCompleted = invoice.remindersCompleted;

      if (oldDueDate !== newDueDate && (isOverdue || remindersCompleted)) {
        setPendingFormData({
          ...formData,
          amount: parseFloat(formData.amount),
          dueDate: new Date(formData.dueDate).toISOString(),
        });
        setShowReminderModal(true);
        return;
      }
    }

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

  const copyInvoiceLink = () => {
    const link = `${window.location.origin}/dashboard/invoices/${params.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-sm text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
  const nextFollowUp = invoice.followUps?.find(f => f.status === 'PENDING');

  return (
    <div className="min-h-screen bg-background">
      {/* Success Banner - Shows once after invoice creation */}
      {showSuccessBanner && (
        <div className="bg-success/10 border-b border-success/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-success">Invoice created successfully</p>
              </div>
              <button
                onClick={() => setShowSuccessBanner(false)}
                className="text-success/70 hover:text-success p-1"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Navigation */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/invoices"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Invoices
            </Link>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Title & Status */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Invoice {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} isOverdue={isOverdue} />
          </div>
          <p className="text-muted-foreground">
            {invoice.clientName} &middot; {invoice.currency} {invoice.amount.toLocaleString()}
          </p>
        </div>

        {/* Primary Actions - Above the fold */}
        {!editing && invoice.status === 'PENDING' && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Primary: View/Send Reminder */}
              <Link
                href={`/dashboard/activity?invoice=${invoice.id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-all text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                View Email Activity
              </Link>

              {/* Secondary: Copy Link */}
              <button
                onClick={copyInvoiceLink}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors text-sm sm:text-base"
              >
                {linkCopied ? (
                  <>
                    <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Invoice Link
                  </>
                )}
              </button>
            </div>

            {/* Next reminder info */}
            {nextFollowUp && (
              <p className="mt-4 text-xs text-muted-foreground">
                Next reminder scheduled for {new Date(nextFollowUp.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Reminder Status Banners */}
        {invoice && !invoice.remindersEnabled && invoice.remindersPausedReason === 'user_updated_date_no_restart' && (
          <div className="bg-info/10 border border-info/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-info mb-1">Reminders paused</h3>
                <p className="text-sm text-info/90">
                  No further emails will be sent unless you restart reminders.
                </p>
                <button
                  onClick={() => {
                    fetch(`/api/invoices/${params.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        restartReminders: true,
                        dueDate: invoice.dueDate,
                      }),
                    }).then(() => loadInvoice());
                  }}
                  className="mt-3 px-4 py-2 bg-info text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
                >
                  Restart reminders
                </button>
              </div>
            </div>
          </div>
        )}

        {invoice && invoice.remindersResetAt && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-success">
                  Reminders restarted on {new Date(invoice.remindersResetAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} using new due date.
                </p>
              </div>
            </div>
          </div>
        )}

        {invoice && isReminderExhausted({
          ...invoice,
          remindersCompleted: invoice.remindersCompleted || false,
          lastReminderSentAt: invoice.lastReminderSentAt ? new Date(invoice.lastReminderSentAt) : null,
          totalScheduledReminders: invoice.totalScheduledReminders
        }) && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-warning mb-1">All reminders sent</h3>
                <p className="text-sm text-warning/90">
                  {getReminderStatusMessage({
                    ...invoice,
                    remindersCompleted: invoice.remindersCompleted || false,
                    lastReminderSentAt: invoice.lastReminderSentAt ? new Date(invoice.lastReminderSentAt) : null,
                    totalScheduledReminders: invoice.totalScheduledReminders
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Invoice Details</h2>
              </div>

              {editing ? (
                <form onSubmit={handleUpdate} className="p-5 space-y-5">
                  <FormSection title="Invoice Information">
                    <FormField id="clientName" label="Client Name" required>
                      <FormInput
                        id="clientName"
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        autoTrim
                      />
                    </FormField>

                    <FormField id="clientEmail" label="Client Email" required>
                      <FormInput
                        id="clientEmail"
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                        autoTrim
                      />
                    </FormField>

                    <FormField id="invoiceNumber" label="Invoice Number" required>
                      <FormInput
                        id="invoiceNumber"
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        autoTrim
                      />
                    </FormField>

                    <FormField id="amount" label="Amount" required>
                      <FormAmountInput
                        id="amount"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        currency={formData.currency}
                      />
                    </FormField>

                    <FormField id="currency" label="Currency" required>
                      <FormSelect
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        options={[
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                          { value: 'GBP', label: 'GBP' },
                          { value: 'UZS', label: 'UZS' },
                        ]}
                      />
                    </FormField>

                    <FormField id="dueDate" label="Due Date" required>
                      <FormDateInput
                        id="dueDate"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
                    </FormField>
                  </FormSection>

                  <FormSection title="Status & Notes" fullWidth>
                    <FormField id="status" label="Status" required>
                      <FormSelect
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                        options={[
                          { value: 'PENDING', label: 'Pending' },
                          { value: 'PAID', label: 'Paid' },
                          { value: 'CANCELLED', label: 'Cancelled' },
                        ]}
                      />
                    </FormField>

                    <FormField id="notes" label="Notes">
                      <FormTextarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                      />
                    </FormField>
                  </FormSection>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="flex-1 h-11 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-11 bg-foreground text-background rounded-lg hover:opacity-90 transition-all font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5">
                  <dl className="space-y-4">
                    <DetailRow label="Client" value={invoice.clientName} />
                    <DetailRow label="Email" value={invoice.clientEmail} />
                    <DetailRow label="Invoice #" value={invoice.invoiceNumber} mono />
                    <DetailRow
                      label="Amount"
                      value={`${invoice.currency} ${invoice.amount.toLocaleString()}`}
                      highlight
                    />
                    <DetailRow
                      label="Due Date"
                      value={new Date(invoice.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    />
                    <DetailRow
                      label="Created"
                      value={new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    />
                    {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
                  </dl>
                </div>
              )}
            </div>
          </div>

          {/* Follow-ups Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Follow-ups</h2>
              </div>
              <div className="p-5">
                {invoice.followUps && invoice.followUps.length > 0 ? (
                  <div className="space-y-3">
                    {invoice.followUps.map((followUp) => (
                      <div key={followUp.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {new Date(followUp.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <FollowUpStatusBadge status={followUp.status} />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{followUp.subject}</p>
                        {followUp.sentAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent {new Date(followUp.sentAt).toLocaleString()}
                          </p>
                        )}
                        {followUp.errorMessage && (
                          <p className="text-xs text-destructive mt-1">{followUp.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No follow-ups scheduled</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reminder Restart Modal */}
      {showReminderModal && invoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Restart reminders?</h3>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                You changed the due date. Do you want to restart reminder emails based on the new date?
              </p>
              <p className="text-xs text-muted-foreground italic">
                Previous email activity will remain in the log.
              </p>
              {new Date(formData.dueDate) < new Date() && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mt-3">
                  <p className="text-xs text-warning">
                    <strong>Note:</strong> New due date is in the past. Reminders may send immediately.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => performUpdate(true)}
                className="flex-1 px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
              >
                Restart reminders
              </button>
              <button
                onClick={() => performUpdate(false)}
                className="flex-1 px-4 py-2.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors"
              >
                Update date only
              </button>
            </div>
            <button
              onClick={() => {
                setShowReminderModal(false);
                setPendingFormData(null);
              }}
              className="w-full mt-3 px-4 py-2 text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border last:border-0">
      <dt className="text-sm text-muted-foreground mb-1 sm:mb-0">{label}</dt>
      <dd className={`text-sm ${highlight ? 'font-semibold text-foreground' : 'text-foreground'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  const actualStatus = isOverdue ? 'OVERDUE' : status;
  const styles = {
    PENDING: 'bg-warning/10 text-warning border-warning/20',
    PAID: 'bg-success/10 text-success border-success/20',
    OVERDUE: 'bg-destructive/10 text-destructive border-destructive/20',
    CANCELLED: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[actualStatus as keyof typeof styles]}`}>
      {actualStatus}
    </span>
  );
}

function FollowUpStatusBadge({ status }: { status: string }) {
  const styles = {
    PENDING: 'bg-info/10 text-info',
    SENT: 'bg-success/10 text-success',
    SKIPPED: 'bg-warning/10 text-warning',
    FAILED: 'bg-destructive/10 text-destructive',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
