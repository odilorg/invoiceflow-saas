'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HelpBox from '@/components/HelpBox';
import { HELP_CONTENT } from '@/lib/help-content';

interface Stats {
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalFollowUpsSent: number;
  upcomingFollowUps: number;
  planStatus: 'FREE' | 'PAID';
}

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysPastDue: number;
}

interface SetupStatus {
  hasTemplates: boolean;
  hasActiveSchedule: boolean;
  hasInvoices: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFab, setShowFab] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const statsRes = await fetch('/api/dashboard/stats');
        const statsData = await statsRes.json();
        setStats(statsData);

        // Load overdue invoices
        const invoicesRes = await fetch('/api/invoices');
        if (invoicesRes.ok) {
          const invoices = await invoicesRes.json();
          const now = new Date();
          const overdue = invoices
            .filter((inv: any) => inv.status === 'PENDING' && new Date(inv.dueDate) < now)
            .map((inv: any) => ({
              ...inv,
              daysPastDue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
            }))
            .sort((a: any, b: any) => b.daysPastDue - a.daysPastDue)
            .slice(0, 5);
          setOverdueInvoices(overdue);
        }

        // Check setup status
        const [templatesRes, schedulesRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/schedules'),
        ]);

        const templates = templatesRes.ok ? await templatesRes.json() : [];
        const schedules = schedulesRes.ok ? await schedulesRes.json() : [];
        const invoices = invoicesRes.ok ? await invoicesRes.json() : [];

        setSetupStatus({
          hasTemplates: templates.length > 0,
          hasActiveSchedule: schedules.some((s: any) => s.isActive),
          hasInvoices: invoices.length > 0,
        });
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle FAB visibility based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Show FAB when scrolled past 400px (roughly past summary section)
      setShowFab(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalOutstanding = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Determine which setup prompt to show (priority order)
  const getSetupPrompt = () => {
    if (!setupStatus) return null;

    if (!setupStatus.hasTemplates) {
      return {
        title: 'Create your first email template',
        description: 'Start by creating email templates for your invoice follow-ups.',
        action: 'Create Template',
        href: '/dashboard/templates',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        ),
      };
    }

    if (!setupStatus.hasActiveSchedule) {
      return {
        title: 'Set up your follow-up schedule',
        description: 'Configure when follow-up emails should be sent for overdue invoices.',
        action: 'Create Schedule',
        href: '/dashboard/schedules',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    }

    if (!setupStatus.hasInvoices) {
      return {
        title: 'Add your first invoice',
        description: 'Start tracking invoices and automate follow-ups for overdue payments.',
        action: 'Add Invoice',
        href: '/dashboard/invoices',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      };
    }

    return null;
  };

  const setupPrompt = getSetupPrompt();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Overview of your invoices and follow-ups</p>
            </div>
            <Link
              href="/dashboard/invoices"
              className="hidden sm:inline-flex px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
            >
              + New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Help Box */}
        <HelpBox
          title={HELP_CONTENT.dashboard.title}
          items={HELP_CONTENT.dashboard.items}
          storageKey={HELP_CONTENT.dashboard.storageKey}
          defaultOpen={false}
        />

        {/* Setup Prompt - Only ONE visible at a time */}
        {setupPrompt && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                {setupPrompt.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">{setupPrompt.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{setupPrompt.description}</p>
              </div>
              <Link
                href={setupPrompt.href}
                className="flex-shrink-0 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
              >
                {setupPrompt.action}
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid - Mobile: urgency-first order */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Mobile order: Overdue first for urgency scanning */}
          <StatCard
            label="Overdue"
            value={stats?.overdueInvoices || 0}
            highlight={!!stats?.overdueInvoices}
            className="order-1"
          />
          <StatCard
            label="Unpaid Invoices"
            value={stats?.pendingInvoices || 0}
            trend={stats?.overdueInvoices ? `${stats.overdueInvoices} overdue` : undefined}
            trendNegative={!!stats?.overdueInvoices}
            className="order-2"
          />
          <StatCard
            label="Total Outstanding"
            value={`$${totalOutstanding.toLocaleString()}`}
            isAmount
            className="order-3"
          />
          <StatCard
            label="Paid This Month"
            value={stats?.paidInvoices || 0}
            helper="Last 30 days"
            className="order-4"
          />
        </div>

        {/* Main sections */}
        <div className="grid grid-cols-1 gap-6">
          {/* Overdue Invoices */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Overdue Invoices</h2>
                {overdueInvoices.length > 0 && (
                  <Link
                    href="/dashboard/invoices"
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    View all →
                  </Link>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {overdueInvoices.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-900">No overdue invoices</p>
                  <p className="text-sm text-slate-600 mt-1">All invoices are up to date</p>
                </div>
              ) : (
                overdueInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="block px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-medium text-slate-900">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="text-sm text-slate-600">{invoice.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-red-600 font-medium">
                            {invoice.daysPastDue} days overdue
                          </span>
                          <span className="text-xs text-slate-500">
                            Due {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {invoice.currency} {invoice.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Follow-up Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Emails sent</span>
                    <span className="text-sm font-semibold text-slate-900">{stats?.totalFollowUpsSent || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Upcoming follow-ups</span>
                    <span className="text-sm font-semibold text-slate-900">{stats?.upcomingFollowUps || 0}</span>
                  </div>
                  {stats?.totalFollowUpsSent === 0 && stats?.upcomingFollowUps === 0 && (
                    <div className="pt-3 pb-1">
                      <p className="text-xs text-slate-500">
                        No emails sent yet. Reminders will appear here once invoices become due.
                      </p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-slate-200">
                    <Link
                      href="/dashboard/activity"
                      className="text-sm text-slate-600 hover:text-slate-900"
                    >
                      View activity log →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - only show for first-time users */}
            {(!stats?.totalInvoices || stats?.totalFollowUpsSent === 0) && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <Link
                      href="/dashboard/invoices"
                      className="block px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Manage invoices
                    </Link>
                    <Link
                      href="/dashboard/templates"
                      className="block px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Edit templates
                    </Link>
                    <Link
                      href="/dashboard/schedules"
                      className="block px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Configure schedule
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Free plan notice - entire card tappable */}
        {stats?.planStatus === 'FREE' && (
          <a
            href={process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL || '#'}
            className="mt-6 block bg-slate-50 border border-slate-200 rounded-lg p-6 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Free Plan</h3>
                <p className="text-sm text-slate-600 mt-1">
                  You're using {stats.totalInvoices}/5 invoices. Upgrade to unlock unlimited invoices and advanced features.
                </p>
              </div>
              <span className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md whitespace-nowrap">
                Upgrade
              </span>
            </div>
          </a>
        )}
      </div>

      {/* Mobile FAB - hidden at top, shows when scrolled past summary */}
      {showFab && (
        <Link
          href="/dashboard/invoices"
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 transition-all z-30"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendNegative,
  highlight,
  isAmount,
  helper,
  className,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendNegative?: boolean;
  highlight?: boolean;
  isAmount?: boolean;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-5 ${className || ''}`}>
      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${
        highlight ? 'text-red-600' : 'text-slate-900'
      }`}>
        {value}
      </p>
      {trend && (
        <p className={`text-xs mt-1 ${
          trendNegative ? 'text-red-600' : 'text-slate-600'
        }`}>
          {trend}
        </p>
      )}
      {helper && (
        <p className="text-xs text-slate-500 mt-1">
          {helper}
        </p>
      )}
    </div>
  );
}
