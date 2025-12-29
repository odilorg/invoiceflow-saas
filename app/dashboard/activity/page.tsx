'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HelpBox from '@/components/HelpBox';
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

  // Find next reminder
  const getNextReminder = () => {
    if (!invoices || invoices.length === 0) return null;

    const unpaidInvoices = invoices.filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE');
    let nextReminder: { invoice: Invoice; followUp: any } | null = null;
    let earliestDate: Date | null = null;

    for (const invoice of unpaidInvoices) {
      const pendingFollowUps = invoice.followUps?.filter(f => f.status === 'PENDING') || [];
      if (pendingFollowUps.length > 0) {
        const nextFollowUp = pendingFollowUps[0]; // Already sorted by scheduledDate
        const followUpDate = new Date(nextFollowUp.scheduledDate);

        if (!earliestDate || followUpDate < earliestDate) {
          earliestDate = followUpDate;
          nextReminder = { invoice, followUp: nextFollowUp };
        }
      }
    }

    return nextReminder;
  };

  const nextReminder = getNextReminder();

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-sm text-slate-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Email Activity</h1>
        <p className="text-sm text-slate-600">View all sent follow-up emails and their status</p>
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
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
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
            className={`bg-white border border-slate-200 rounded-xl p-4 transition-opacity ${
              isEmpty ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total</p>
                <p className="text-2xl font-semibold text-slate-900">{activityStats.total}</p>
              </div>
            </div>
          </div>

          {/* Success */}
          <div
            className={`bg-white border border-slate-200 rounded-xl p-4 transition-opacity ${
              isEmpty ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Success</p>
                <p className="text-2xl font-semibold text-slate-900">{activityStats.success}</p>
              </div>
            </div>
          </div>

          {/* Failed */}
          <div
            className={`bg-white border border-slate-200 rounded-xl p-4 transition-opacity ${
              isEmpty ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Failed</p>
                <p className="text-2xl font-semibold text-slate-900">{activityStats.failed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Helper text when all stats are zero */}
        {isEmpty && (
          <p className="text-xs text-slate-500 text-center">
            Stats update after first reminder is sent
          </p>
        )}
      </div>

      {/* Activity Log */}
      {filteredLogs.length === 0 ? (
        <div>
          {/* Next Reminder Indicator */}
          {nextReminder && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Upcoming reminder</p>
                  <p className="text-base font-semibold text-blue-900">
                    {nextReminder.invoice.clientName}
                  </p>
                  <p className="text-sm text-blue-700">
                    Invoice: <span className="font-mono">{nextReminder.invoice.invoiceNumber}</span>
                  </p>
                  <p className="text-sm text-blue-600">
                    {formatRelativeTime(new Date(nextReminder.followUp.scheduledDate))}
                    {' · '}
                    {new Date(nextReminder.followUp.scheduledDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 lg:p-8 text-center border border-slate-200">
            <svg className="w-20 h-20 mx-auto text-slate-300 opacity-60 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">No email activity yet</h3>

            <div className="max-w-md mx-auto space-y-3 mb-6">
              <p className="text-sm text-slate-600">
                Reminders are sent automatically on invoice due dates and overdue steps.
              </p>

              {/* Contextual hint when unpaid invoices exist */}
              {unpaidInvoicesCount > 0 && isEmpty && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3">
                  <p className="text-sm text-slate-700">
                    You have {unpaidInvoicesCount} unpaid invoice{unpaidInvoicesCount > 1 ? 's' : ''}, but no reminders have been sent yet.
                    The first reminder will be sent on the invoice due date.
                  </p>
                </div>
              )}

              {!hasActiveSchedule && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                  <svg className="w-5 h-5 text-amber-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-800 font-semibold">
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
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
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
          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-1">
                      {new Date(log.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(log.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="font-medium text-slate-900 mb-1 truncate">{log.recipientEmail}</div>
                  </div>
                  {log.success ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 shrink-0 ml-2">
                      Sent
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 shrink-0 ml-2">
                      Failed
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-600 mb-2 line-clamp-1">{log.subject}</div>
                {log.followUp && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-mono">{log.followUp.invoice.invoiceNumber}</span>
                    <span>•</span>
                    <span className="truncate">{log.followUp.invoice.clientName}</span>
                    {log.followUp.template && (
                      <>
                        <span>•</span>
                        <span className="truncate">{log.followUp.template.name}</span>
                      </>
                    )}
                  </div>
                )}
                {!log.success && log.errorMessage && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2 line-clamp-2">{log.errorMessage}</div>
                )}
                <button
                  onClick={() => setDetailsModal(log)}
                  className="min-h-[44px] w-full mt-2 px-4 py-2 text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Subject</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Template</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900">
                        {new Date(log.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <br />
                      <span className="text-xs text-slate-500">
                        {new Date(log.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900">{log.recipientEmail}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-slate-900 line-clamp-2">{log.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      {log.followUp ? (
                        <div>
                          <span className="text-sm font-mono text-slate-900">
                            {log.followUp.invoice.invoiceNumber}
                          </span>
                          <br />
                          <span className="text-xs text-slate-500">
                            {log.followUp.invoice.clientName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.followUp?.template ? (
                        <span className="text-sm text-slate-700">{log.followUp.template.name}</span>
                      ) : (
                        <span className="text-sm text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.success ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Sent
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Failed
                          </span>
                          {log.errorMessage && (
                            <p className="text-xs text-red-600 mt-1 line-clamp-1">{log.errorMessage}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDetailsModal(log)}
                        className="text-sm text-slate-700 hover:text-slate-900 font-medium"
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Email Details</h2>
                  <p className="text-sm text-slate-500 mt-1">
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
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                {detailsModal.success ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                    ✓ Sent Successfully
                  </span>
                ) : (
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                      ✗ Failed
                    </span>
                    {detailsModal.errorMessage && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-900 mb-1">Error Details</p>
                        <p className="text-sm text-red-700">{detailsModal.errorMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
                <p className="text-sm text-slate-900">{detailsModal.recipientEmail}</p>
              </div>

              {/* Invoice */}
              {detailsModal.followUp && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice</label>
                  <p className="text-sm text-slate-900">
                    <span className="font-mono">{detailsModal.followUp.invoice.invoiceNumber}</span> • {detailsModal.followUp.invoice.clientName}
                  </p>
                </div>
              )}

              {/* Template */}
              {detailsModal.followUp?.template && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Template Used</label>
                  <p className="text-sm text-slate-900">{detailsModal.followUp.template.name}</p>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <p className="text-sm text-slate-900">{detailsModal.subject}</p>
              </div>

              {/* Body */}
              {detailsModal.body && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-900 whitespace-pre-wrap">
                    {detailsModal.body}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setDetailsModal(null)}
                className="w-full min-h-[44px] px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
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
          <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
            No emails yet to filter
          </div>
        </div>
      )}
    </div>
  );
}
