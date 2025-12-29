'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HelpBox from '@/components/HelpBox';
import EntityListCard from '@/components/EntityListCard';
import { HELP_CONTENT } from '@/lib/help-content';
import { PAGE_X, PAGE_Y, SECTION_GAP, H1, H2, SUBTLE, LABEL, BTN_MIN_H } from '@/lib/ui/tokens';

interface Stats {
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalFollowUpsSent: number;
  upcomingFollowUps: number;
  planStatus: 'FREE' | 'STARTER' | 'PRO';
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-border border-t-foreground rounded-full animate-spin" />
          <p className={SUBTLE}>Loading dashboard...</p>
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className={`max-w-6xl mx-auto ${PAGE_X} ${PAGE_Y}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`${H1} text-foreground mb-1`}>Dashboard</h1>
              <p className={SUBTLE}>Overview of your invoices and follow-ups</p>
            </div>
            <Link
              href="/dashboard/invoices"
              className={`hidden sm:inline-flex ${BTN_MIN_H} px-6 py-2.5 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors items-center`}
            >
              + New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-6xl mx-auto ${PAGE_X} ${PAGE_Y}`}>
        {/* Help Box */}
        <HelpBox
          title={HELP_CONTENT.dashboard.title}
          items={HELP_CONTENT.dashboard.items}
          storageKey={HELP_CONTENT.dashboard.storageKey}
          defaultOpen={false}
        />

        {/* Setup Prompt - Only ONE visible at a time */}
        {setupPrompt && (
          <div className="mb-6 bg-info/15 border border-info/20 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-info/25 rounded-lg flex items-center justify-center text-info">
                {setupPrompt.icon}
              </div>
              <div className="flex-1">
                <h3 className={`${H2} text-foreground`}>{setupPrompt.title}</h3>
                <p className={`${SUBTLE} mt-1`}>{setupPrompt.description}</p>
              </div>
              <Link
                href={setupPrompt.href}
                className={`flex-shrink-0 ${BTN_MIN_H} px-6 py-2.5 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors inline-flex items-center w-full sm:w-auto justify-center`}
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
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconBg="bg-destructive/15"
            iconColor="text-destructive"
            className="order-1"
          />
          <StatCard
            label="Unpaid Invoices"
            value={stats?.pendingInvoices || 0}
            trend={stats?.overdueInvoices ? `${stats.overdueInvoices} overdue` : undefined}
            trendNegative={!!stats?.overdueInvoices}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            iconBg="bg-warning/15"
            iconColor="text-warning"
            className="order-2"
          />
          <StatCard
            label="Total Outstanding"
            value={totalOutstanding === 0 ? '—' : `$${totalOutstanding.toLocaleString()}`}
            isAmount
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
            className="order-3"
          />
          <StatCard
            label="Paid This Month"
            value={stats?.paidInvoices || 0}
            helper="Last 30 days"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconBg="bg-success/15"
            iconColor="text-success"
            className="order-4"
          />
        </div>

        {/* Main sections */}
        <div className="grid grid-cols-1 gap-6">
          {/* Overdue Invoices */}
          <div className="bg-card border border-border rounded-xl">
            <div className={`${PAGE_X} py-4 border-b border-border`}>
              <div className="flex items-center justify-between">
                <h2 className={`${H2} text-foreground`}>Overdue Invoices</h2>
                {overdueInvoices.length > 0 && (
                  <Link
                    href="/dashboard/invoices"
                    className={`${SUBTLE} hover:text-foreground font-medium`}
                  >
                    View all →
                  </Link>
                )}
              </div>
            </div>
            {overdueInvoices.length === 0 ? (
              <div className={`${PAGE_X} py-12 text-center`}>
                <svg className="w-12 h-12 mx-auto text-muted-foreground opacity-60 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={`${H2} text-foreground`}>No overdue invoices</p>
                <p className={`${SUBTLE} mt-1`}>All invoices are up to date</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {overdueInvoices.map((invoice) => (
                  <EntityListCard
                    key={invoice.id}
                    title={`${invoice.invoiceNumber}`}
                    subtitle={invoice.clientName}
                    badge={{
                      label: `${invoice.daysPastDue} days overdue`,
                      variant: 'danger',
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
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl">
              <div className={`${PAGE_X} py-4 border-b border-border`}>
                <h2 className={`${H2} text-foreground`}>Follow-up Activity</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className={SUBTLE}>Reminders sent</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{stats?.totalFollowUpsSent || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-info/15 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className={SUBTLE}>Upcoming follow-ups</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{stats?.upcomingFollowUps || 0}</span>
                  </div>
                  {stats?.totalFollowUpsSent === 0 && stats?.upcomingFollowUps === 0 && (
                    <div className="pt-3 pb-1">
                      <p className="text-xs text-muted-foreground">
                        No emails sent yet. Reminders will appear here once invoices become due.
                      </p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-border">
                    <Link
                      href="/dashboard/activity"
                      className={`${BTN_MIN_H} w-full px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors inline-flex items-center justify-center gap-2`}
                    >
                      View activity log
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - only show for first-time users */}
            {(!stats?.totalInvoices || stats?.totalFollowUpsSent === 0) && (
              <div className="bg-card border border-border rounded-xl">
                <div className={`${PAGE_X} py-4 border-b border-border`}>
                  <h2 className={`${H2} text-foreground`}>Quick Actions</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3">
                    <Link
                      href="/dashboard/invoices"
                      className={`w-full ${BTN_MIN_H} px-4 py-2.5 text-sm font-medium text-background bg-foreground hover:bg-foreground/90 rounded-lg transition-colors inline-flex items-center gap-3`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Manage invoices
                    </Link>
                    <Link
                      href="/dashboard/templates"
                      className={`w-full ${BTN_MIN_H} px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border hover:bg-muted rounded-lg transition-colors inline-flex items-center gap-3`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Edit templates
                    </Link>
                    <Link
                      href="/dashboard/schedules"
                      className={`w-full ${BTN_MIN_H} px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border hover:bg-muted rounded-lg transition-colors inline-flex items-center gap-3`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
            className="mt-6 block bg-muted border border-border rounded-xl p-4 sm:p-6 hover:border-foreground/20 transition-colors cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className={`${H2} text-foreground`}>Free Plan</h3>
                <p className={`${SUBTLE} mt-1`}>
                  You're using {stats.totalInvoices}/5 invoices. Upgrade to unlock unlimited invoices and advanced features.
                </p>
              </div>
              <span className={`${BTN_MIN_H} px-6 py-2.5 bg-foreground text-background text-sm font-medium rounded-lg whitespace-nowrap inline-flex items-center`}>
                Upgrade
              </span>
            </div>
          </a>
        )}
      </div>

      {/* Mobile FAB - hidden at top, shows when scrolled past summary */}
      {showFab && (
        <Link
          href="/dashboard/invoices?create=true"
          aria-label="Create invoice"
          title="Create invoice"
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center shadow-lg hover:bg-foreground/90 transition-all z-30"
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
  icon,
  iconBg,
  iconColor,
  className,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendNegative?: boolean;
  highlight?: boolean;
  isAmount?: boolean;
  helper?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  className?: string;
}) {
  const isEmpty = value === 0 || value === '—';

  return (
    <div className={`bg-card border border-border rounded-xl p-4 transition-opacity ${
      isEmpty ? 'opacity-70' : ''
    } ${className || ''}`}>
      <div className="flex items-start justify-between mb-3">
        <p className={LABEL}>{label}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg || 'bg-muted'} ${iconColor || 'text-muted-foreground'}`}>
            {icon}
          </div>
        )}
      </div>
      <p className={`text-2xl font-semibold ${
        highlight ? 'text-destructive' : 'text-foreground'
      }`}>
        {value}
      </p>
      {trend && (
        <p className={`text-xs mt-1 ${
          trendNegative ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {trend}
        </p>
      )}
      {helper && (
        <p className="text-xs text-muted-foreground mt-1">
          {helper}
        </p>
      )}
    </div>
  );
}
