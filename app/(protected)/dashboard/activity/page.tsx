'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HelpBox from '@/components/HelpBox';
import EntityListCard from '@/components/EntityListCard';
import Badge from '@/components/Badge';
import { HELP_CONTENT, EMPTY_STATE_CONTENT } from '@/lib/help-content';

interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  body?: string;
  sentAt: string;
  success: boolean;
  errorMessage?: string;
  followUp?: {
    id: string;
    template?: {
      name: string;
    };
    invoice: {
      invoiceNumber: string;
      clientName: string;
    };
  };
}

interface Schedule {
  id: string;
  isActive: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  followUps: {
    id: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    scheduledDate: string;
  }[];
}

interface DashboardStats {
  pendingInvoices: number;
  overdueInvoices: number;
}

export default function ActivityPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [detailsModal, setDetailsModal] = useState<EmailLog | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadData();

    // Reload data when page becomes visible (e.g., navigating back from another page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    // Reload data when window regains focus (client-side navigation)
    const handleFocus = () => {
      loadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function loadData() {
    try {
      const [logsRes, schedulesRes, invoicesRes, statsRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/schedules'),
        fetch('/api/invoices'),
        fetch('/api/dashboard/stats'),
      ]);

      if (!logsRes.ok || !schedulesRes.ok || !invoicesRes.ok || !statsRes.ok) {
        if (logsRes.status === 401 || schedulesRes.status === 401 || invoicesRes.status === 401 || statsRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load data');
      }

      const [logsData, schedulesData, invoicesData, statsData] = await Promise.all([
        logsRes.json(),
        schedulesRes.json(),
        invoicesRes.json(),
        statsRes.json(),
      ]);

      setLogs(logsData);
      setSchedules(schedulesData);
      setInvoices(invoicesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (filter === 'success') return log.success;
    if (filter === 'failed') return !log.success;
    return true;
  });

  const activityStats = {
    total: logs.length,
    success: logs.filter((l) => l.success).length,
    failed: logs.filter((l) => !l.success).length,
  };

  const hasActiveSchedule = schedules.some((s) => s.isActive);
  const isEmpty = logs.length === 0;
  const unpaidInvoicesCount = (stats?.pendingInvoices || 0) + (stats?.overdueInvoices || 0);

  // Find all upcoming reminders
  const getUpcomingReminders = () => {
    if (!invoices || invoices.length === 0) return [];

    const unpaidInvoices = invoices.filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE');
    const upcomingReminders: { invoice: Invoice; followUp: any }[] = [];

    for (const invoice of unpaidInvoices) {
      const pendingFollowUps = invoice.followUps?.filter(f => f.status === 'PENDING') || [];
      if (pendingFollowUps.length > 0) {
        const nextFollowUp = pendingFollowUps[0]; // Already sorted by scheduledDate
        upcomingReminders.push({ invoice, followUp: nextFollowUp });
      }
    }

    // Sort by scheduled date (earliest first)
    return upcomingReminders.sort((a, b) =>
      new Date(a.followUp.scheduledDate).getTime() - new Date(b.followUp.scheduledDate).getTime()
    );
  };

  const upcomingReminders = getUpcomingReminders();
  const nextReminder = upcomingReminders.length > 0 ? upcomingReminders[0] : null;

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days < 0) return 'overdue';
    if (days === 0) {
      if (hours <= 0) return 'due now';
      return `in ${hours} hour${hours === 1 ? '' : 's'}`;
    }
    if (days === 1) return 'tomorrow';
    if (days <= 7) return `in ${days} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleFilterClick = (f: 'all' | 'success' | 'failed') => {
    if (isEmpty) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    setFilter(f);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-sm text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground mb-1">Email Activity</h1>
        <p className="text-sm text-muted-foreground">View all sent follow-up emails and their status</p>
      </div>

      {/* Help Box */}
      <HelpBox
        title={HELP_CONTENT.emailActivity.title}
        items={HELP_CONTENT.emailActivity.items}
        storageKey={HELP_CONTENT.emailActivity.storageKey}
        defaultOpen={false}
      />

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'success', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterClick(f)}
            disabled={isEmpty}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
              isEmpty
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : filter === f
                ? 'bg-foreground text-background'
                : 'bg-card text-foreground hover:bg-muted border border-border'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          {/* Total */}
          <div
            className={`bg-card border border-border rounded-xl p-4 transition-opacity ${
              isEmpty ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold text-foreground">{activityStats.total}</p>
              </div>
            </div>
          </div>

          {/* Success */}
          <div
            className={`bg-card border border-border rounded-xl p-4 transition-opacity ${
              isEmpty ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success</p>
                <p className="text-2xl font-semibold text-foreground">{activityStats.success}</p>
              </div>
            </div>
          </div>

          {/* Failed */}
          <div
            className={`bg-card border border-border rounded-xl p-4 transition-opacity ${
              isEmpty ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-semibold text-foreground">{activityStats.failed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Helper text when all stats are zero */}
        {isEmpty && (
          <p className="text-xs text-muted-foreground text-center">
            Stats update after first reminder is sent
          </p>
        )}
      </div>

      {/* Activity Log */}
      {filteredLogs.length === 0 ? (
        <div>
          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <div className="space-y-3 mb-6">
              <p className="text-xs font-medium text-info uppercase tracking-wide">
                Upcoming Reminder{upcomingReminders.length > 1 ? 's' : ''} ({upcomingReminders.length})
              </p>
              {upcomingReminders.map((reminder, index) => (
                <div key={reminder.invoice.id} className="bg-info/10 border border-info/20 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="text-base font-semibold text-foreground">
                        {reminder.invoice.clientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Invoice: <span className="font-mono">{reminder.invoice.invoiceNumber}</span>
                      </p>
                      <p className="text-sm text-info">
                        {new Date(reminder.followUp.scheduledDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {' · '}
                        {formatRelativeTime(new Date(reminder.followUp.scheduledDate))}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-info/20 rounded-lg shrink-0">
                      <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-card rounded-xl p-6 lg:p-8 text-center border border-border">
            <svg className="w-20 h-20 mx-auto text-muted-foreground opacity-60 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>

            <h3 className="text-lg font-semibold text-foreground mb-2">No email activity yet</h3>

            <div className="max-w-md mx-auto space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                Reminders are sent automatically on invoice due dates and overdue steps.
              </p>

              {/* Contextual hint when unpaid invoices exist */}
              {unpaidInvoicesCount > 0 && isEmpty && (
                <div className="bg-muted border border-border rounded-xl p-3 mt-3">
                  <p className="text-sm text-foreground">
                    You have {unpaidInvoicesCount} unpaid invoice{unpaidInvoicesCount > 1 ? 's' : ''}, but no reminders have been sent yet.
                    The first reminder will be sent on the invoice due date.
                  </p>
                </div>
              )}

              {!hasActiveSchedule && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 mt-4">
                  <svg className="w-5 h-5 text-warning mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-warning font-semibold">
                    {EMPTY_STATE_CONTENT.emailActivity.warning}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {EMPTY_STATE_CONTENT.emailActivity.actions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className={`min-h-[44px] px-6 py-2.5 text-sm font-medium rounded-lg transition-colors w-full sm:w-auto inline-flex items-center justify-center ${
                    index === 0
                      ? 'bg-foreground text-background hover:opacity-90'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout - EntityListCard */}
          <div className="lg:hidden space-y-4">
            {filteredLogs.map((log) => (
              <EntityListCard
                key={log.id}
                title={log.recipientEmail}
                subtitle={log.subject}
                badge={{
                  label: log.success ? 'Sent' : 'Failed',
                  variant: log.success ? 'success' : 'danger',
                }}
                fields={[
                  {
                    label: 'Sent At',
                    value: new Date(log.sentAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }),
                  },
                  ...(log.followUp ? [
                    {
                      label: 'Invoice',
                      value: (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs">{log.followUp.invoice.invoiceNumber}</span>
                          <span className="text-xs text-muted-foreground">{log.followUp.invoice.clientName}</span>
                        </div>
                      ),
                    },
                  ] : []),
                  ...(log.followUp?.template ? [
                    {
                      label: 'Template',
                      value: log.followUp.template.name,
                    },
                  ] : []),
                  ...(!log.success && log.errorMessage ? [
                    {
                      label: 'Error',
                      value: (
                        <span className="text-xs text-destructive line-clamp-2">
                          {log.errorMessage}
                        </span>
                      ),
                    },
                  ] : []),
                ]}
                primaryAction={{
                  label: 'View Details',
                  onClick: () => setDetailsModal(log),
                  variant: 'secondary',
                }}
              />
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Subject</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Template</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {new Date(log.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">{log.recipientEmail}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-foreground line-clamp-2">{log.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      {log.followUp ? (
                        <div>
                          <span className="text-sm font-mono text-foreground">
                            {log.followUp.invoice.invoiceNumber}
                          </span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {log.followUp.invoice.clientName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.followUp?.template ? (
                        <span className="text-sm text-foreground">{log.followUp.template.name}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.success ? (
                        <Badge variant="success">Sent</Badge>
                      ) : (
                        <div>
                          <Badge variant="danger">Failed</Badge>
                          {log.errorMessage && (
                            <p className="text-xs text-destructive mt-1 line-clamp-1">{log.errorMessage}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDetailsModal(log)}
                        className="text-sm text-foreground hover:opacity-80 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Email Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(detailsModal.sentAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setDetailsModal(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                {detailsModal.success ? (
                  <Badge variant="success">✓ Sent Successfully</Badge>
                ) : (
                  <div>
                    <Badge variant="danger">✗ Failed</Badge>
                    {detailsModal.errorMessage && (
                      <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-destructive mb-1">Error Details</p>
                        <p className="text-sm text-destructive">{detailsModal.errorMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Recipient</label>
                <p className="text-sm text-foreground">{detailsModal.recipientEmail}</p>
              </div>

              {/* Invoice */}
              {detailsModal.followUp && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Invoice</label>
                  <p className="text-sm text-foreground">
                    <span className="font-mono">{detailsModal.followUp.invoice.invoiceNumber}</span> • {detailsModal.followUp.invoice.clientName}
                  </p>
                </div>
              )}

              {/* Template */}
              {detailsModal.followUp?.template && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Template Used</label>
                  <p className="text-sm text-foreground">{detailsModal.followUp.template.name}</p>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
                <p className="text-sm text-foreground">{detailsModal.subject}</p>
              </div>

              {/* Body */}
              {detailsModal.body && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email Body</label>
                  <div className="bg-muted border border-border rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                    {detailsModal.body}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border">
              <button
                onClick={() => setDetailsModal(null)}
                className="w-full min-h-[44px] px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-foreground text-background px-4 py-3 rounded-lg shadow-lg text-sm">
            No emails yet to filter
          </div>
        </div>
      )}
    </div>
  );
}
