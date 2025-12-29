'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  FormTextarea,
  FormActions,
  FormErrorBanner,
  useFormValidation,
} from '@/components/form';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
}

interface Schedule {
  id: string;
  name: string;
  isActive: boolean;
  steps: Array<{
    id: string;
    dayOffset: number;
    order: number;
    templateId: string;
    template: Template;
  }>;
}

interface UsageStats {
  templates: { used: number; limit: number | null };
  plan: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ template: Template; scheduleCount: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  async function loadData() {
    try {
      const [templatesRes, schedulesRes, usageRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/schedules'),
        fetch('/api/billing/usage'),
      ]);

      if (!templatesRes.ok || !schedulesRes.ok) {
        if (templatesRes.status === 401 || schedulesRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load data');
      }

      const [templatesData, schedulesData] = await Promise.all([
        templatesRes.json(),
        schedulesRes.json(),
      ]);

      setTemplates(templatesData);
      setSchedules(schedulesData);

      // Load usage stats
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getTemplateUsage = (templateId: string) => {
    const usage: Array<{ scheduleName: string; dayOffset: number; isActive: boolean }> = [];

    schedules.forEach((schedule) => {
      schedule.steps.forEach((step) => {
        if (step.templateId === templateId) {
          usage.push({
            scheduleName: schedule.name,
            dayOffset: step.dayOffset,
            isActive: schedule.isActive,
          });
        }
      });
    });

    return usage;
  };

  const getToneIndicator = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('friend') || nameLower.includes('polite') || nameLower.includes('gentle')) {
      return { emoji: '😊', tone: 'Friendly', description: 'Polite, relationship-preserving reminder' };
    }
    if (nameLower.includes('firm') || nameLower.includes('final') || nameLower.includes('urgent')) {
      return { emoji: '⚠️', tone: 'Firm', description: 'Final notice before escalation' };
    }
    return { emoji: '⚖️', tone: 'Neutral', description: 'Professional follow-up' };
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          body: template.body,
          isDefault: false,
        }),
      });

      if (res.ok) {
        loadData();
        showSuccess('Template duplicated');
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const handleDelete = async (template: Template) => {
    const usage = getTemplateUsage(template.id);
    const activeSchedules = usage.filter(u => u.isActive);

    setDeleteConfirm({
      template,
      scheduleCount: activeSchedules.length,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(`/api/templates/${deleteConfirm.template.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
        setDeleteConfirm(null);
        showSuccess('Template deleted');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
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
          <p className="mt-3 text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8 pb-32">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Email Templates</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Manage your follow-up email templates</p>
      </div>

      {/* Help Box */}
      <HelpBox
        title={HELP_CONTENT.templates.title}
        items={HELP_CONTENT.templates.items}
        variant={HELP_CONTENT.templates.variant}
      />

      {/* Usage Counter */}
      {usage && (
        <div className="mb-4 bg-card border border-border rounded-lg p-4">
          <UsageCounter
            used={usage.templates.used}
            limit={usage.templates.limit}
            label="Templates"
          />
        </div>
      )}

      {/* Variable Reference */}
      <div className="mb-6 bg-info/10 border border-info/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-info mb-2">Available Template Variables:</h3>
        <div className="flex flex-wrap gap-2">
          {['{clientName}', '{invoiceNumber}', '{amount}', '{currency}', '{dueDate}', '{invoiceLink}', '{daysOverdue}'].map((v) => (
            <code key={v} className="px-2 py-1 bg-card border border-info/20 rounded text-xs font-mono text-info">
              {v}
            </code>
          ))}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-card rounded-lg p-8 lg:p-12 text-center border border-border">
          <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <h3 className="text-base font-semibold text-foreground mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first reminder in under a minute.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-foreground text-background text-sm rounded-lg hover:opacity-90 transition-colors font-medium min-h-[44px]"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template) => {
            const usage = getTemplateUsage(template.id);
            const toneInfo = getToneIndicator(template.name);
            const activeUsage = usage.filter(u => u.isActive);

            return (
              <EntityListCard
                key={template.id}
                title={`${toneInfo.emoji} ${template.name}`}
                subtitle={toneInfo.description}
                badge={
                  template.isDefault
                    ? { label: 'Default', variant: 'info' }
                    : usage.length === 0
                    ? { label: 'Not in use', variant: 'warning' }
                    : { label: `${activeUsage.length} schedule${activeUsage.length !== 1 ? 's' : ''}`, variant: 'success' }
                }
                fields={[
                  {
                    label: 'Subject',
                    value: (
                      <span className="text-sm text-foreground line-clamp-2">
                        {template.subject}
                      </span>
                    ),
                  },
                  {
                    label: 'Body Preview',
                    value: (
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {template.body}
                      </span>
                    ),
                  },
                ]}
                primaryAction={{
                  label: 'Preview Template',
                  onClick: () => setPreviewTemplate(template),
                  variant: 'secondary',
                }}
                secondaryActions={[
                  {
                    label: 'Edit',
                    onClick: () => setEditingTemplate(template),
                  },
                  {
                    label: 'Duplicate',
                    onClick: () => handleDuplicate(template),
                  },
                ]}
                destructiveAction={
                  !template.isDefault
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
                        onClick: () => handleDelete(template),
                        ariaLabel: 'Delete template',
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Mobile FAB with better positioning */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-foreground text-background rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-colors z-30"
        aria-label="Add Template"
        title="Add Template"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modals */}
      {showCreateModal && (
        <TemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
            showSuccess('Template created');
          }}
        />
      )}

      {editingTemplate && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            setEditingTemplate(null);
            loadData();
            showSuccess('Template updated');
          }}
        />
      )}

      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          template={deleteConfirm.template}
          scheduleCount={deleteConfirm.scheduleCount}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
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

// Preview Modal Component
function PreviewModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const variables = [
    { name: 'clientName', example: 'John Doe' },
    { name: 'invoiceNumber', example: 'INV-001' },
    { name: 'amount', example: '1,000' },
    { name: 'currency', example: 'USD' },
    { name: 'dueDate', example: 'Dec 31, 2025' },
    { name: 'invoiceLink', example: 'https://invoice.example.com/inv-001' },
    { name: 'daysOverdue', example: '3' },
  ];

  const highlightVariables = (text: string) => {
    let result = text;
    const parts: Array<{ text: string; isVar: boolean }> = [];
    let lastIndex = 0;

    const regex = /\{(\w+)\}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isVar: false });
      }
      const variable = variables.find(v => v.name === match![1]);
      parts.push({
        text: variable ? variable.example : match![0],
        isVar: true,
      });
      lastIndex = match!.index + match![0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isVar: false });
    }

    return parts;
  };

  const subjectParts = highlightVariables(template.subject);
  const bodyParts = highlightVariables(template.body);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Preview: {template.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-info/10 border border-info/20 rounded-lg p-3 text-xs text-info">
            💡 Variables shown with sample data. Actual emails will use real invoice data.
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Subject Line</label>
            <div className="p-3 bg-background border border-border rounded-lg text-sm">
              {subjectParts.map((part, i) => (
                part.isVar ? (
                  <span key={i} className="bg-warning/20 px-1 py-0.5 rounded font-semibold">
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Email Body</label>
            <div className="p-4 bg-background border border-border rounded-lg text-sm whitespace-pre-wrap">
              {bodyParts.map((part, i) => (
                part.isVar ? (
                  <span key={i} className="bg-warning/20 px-1 py-0.5 rounded font-semibold">
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 transition-colors min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  template,
  scheduleCount,
  onConfirm,
  onCancel,
}: {
  template: Template;
  scheduleCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">Delete Template?</h3>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-sm text-foreground">
              Are you sure you want to delete <strong>{template.name}</strong>?
            </p>

            {scheduleCount > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <p className="text-sm text-warning font-semibold">
                  ⚠️ Warning: This template is used in {scheduleCount} active schedule{scheduleCount !== 1 ? 's' : ''}.
                </p>
                <p className="text-xs text-warning mt-1">
                  Deleting it may affect your automated follow-up emails.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-destructive text-background text-sm font-medium rounded-lg hover:opacity-90 transition-colors min-h-[44px]"
            >
              Delete Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Modal (Edit/Create) - migrated to unified form system
function TemplateModal({
  template,
  onClose,
  onSuccess,
}: {
  template?: Template;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    isDefault: template?.isDefault || false,
  });
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body'>('subject');
  const [invalidVars, setInvalidVars] = useState<string[]>([]);
  const subjectRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const { errors, isLoading, setLoading, handleApiError, clearAllErrors } = useFormValidation();

  const variables = [
    { name: 'clientName', example: 'John Doe' },
    { name: 'invoiceNumber', example: 'INV-001' },
    { name: 'amount', example: '1,000' },
    { name: 'currency', example: 'USD' },
    { name: 'dueDate', example: 'Dec 31, 2025' },
    { name: 'invoiceLink', example: 'https://invoice.example.com/inv-001' },
    { name: 'daysOverdue', example: '3' },
  ];

  const validVariableNames = variables.map(v => v.name);

  // Validate variables when content changes
  useEffect(() => {
    const text = `${formData.subject} ${formData.body}`;
    const regex = /\{(\w+)\}/g;
    const found: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const varName = match[1];
      if (!validVariableNames.includes(varName) && !found.includes(varName)) {
        found.push(varName);
      }
    }

    setInvalidVars(found);
  }, [formData.subject, formData.body]);

  const insertVariable = (varName: string) => {
    const field = lastFocusedField;
    const ref = field === 'subject' ? subjectRef : bodyRef;
    const input = ref.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = formData[field];
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + `{${varName}}` + after;

    setFormData({ ...formData, [field]: newText });

    setTimeout(() => {
      input.focus();
      const newPos = start + varName.length + 2;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const renderPreview = (text: string) => {
    let preview = text;
    variables.forEach(({ name, example }) => {
      preview = preview.replace(new RegExp(`\\{${name}\\}`, 'g'), example);
    });
    return preview;
  };

  const handleSubmit = async () => {
    if (invalidVars.length > 0) {
      if (!confirm(`Warning: Invalid variables detected: ${invalidVars.join(', ')}. Continue anyway?`)) {
        return;
      }
    }

    clearAllErrors();
    setUpgradeRequired(false);
    setLoading(true);

    try {
      const url = template ? `/api/templates/${template.id}` : '/api/templates';
      const method = template ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        handleApiError(data);
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
        }
        return;
      }

      onSuccess();
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModalShell
      title={template ? 'Edit Template' : 'Create Template'}
      description="Click variable tokens below to insert them into subject or body"
      onClose={onClose}
      stickyFooter
    >
      {/* Error Banner */}
      <FormErrorBanner
        message={errors.serverError}
        upgradeMessage={upgradeRequired ? 'Upgrade your plan to create more templates and unlock additional features.' : undefined}
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

      {/* Invalid Variables Warning */}
      {invalidVars.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-warning font-semibold mb-1">
            ⚠️ Invalid variables detected:
          </p>
          <p className="text-xs text-warning/80">
            {invalidVars.map(v => `{${v}}`).join(', ')} - these will not be replaced in emails
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Variable Tokens */}
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            Click to Insert Variable
          </label>
          <div className="flex flex-wrap gap-2">
            {variables.map(({ name, example }) => (
              <button
                key={name}
                type="button"
                onClick={() => insertVariable(name)}
                className="px-2.5 py-1.5 bg-background border border-border text-foreground rounded text-xs font-mono hover:bg-muted hover:border-ring transition-colors min-h-[36px]"
                title={`Example: ${example}`}
              >
                {`{${name}}`}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Focus the Subject or Body field first, then click a variable to insert it at cursor position
          </p>
        </div>

        <FormSection fullWidth>
          <FormField id="name" label="Template Name" required hint="Give your template a descriptive name">
            <FormInput
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              placeholder="e.g., Friendly Reminder"
              autoTrim
            />
          </FormField>

          <FormField id="subject" label="Subject Line" required hint="Email subject line with variables">
            <FormInput
              id="subject"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              onFocus={() => setLastFocusedField('subject')}
              disabled={isLoading}
              placeholder="e.g., Reminder: Invoice {invoiceNumber} due soon"
              ref={subjectRef}
            />
          </FormField>

          <FormField id="body" label="Email Body" required hint="Email content with variables (use monospace font)">
            <FormTextarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              onFocus={() => setLastFocusedField('body')}
              disabled={isLoading}
              placeholder="Hi {clientName},&#10;&#10;This is a friendly reminder that invoice {invoiceNumber} for {currency} {amount} is due on {dueDate}.&#10;&#10;Best regards"
              rows={10}
              ref={bodyRef}
              className="font-mono"
            />
          </FormField>

          {/* Preview Toggle */}
          {(formData.subject || formData.body) && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 min-h-[36px]"
              >
                {showPreview ? '▼' : '▶'} Preview with sample data
              </button>

              {showPreview && (
                <div className="mt-3 p-4 bg-muted/50 border border-border rounded-lg space-y-3">
                  <p className="text-xs text-muted-foreground italic">
                    Variables replaced with sample data (preview only)
                  </p>
                  {formData.subject && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Subject:</p>
                      <p className="text-sm text-foreground">{renderPreview(formData.subject)}</p>
                    </div>
                  )}
                  {formData.body && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Body:</p>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{renderPreview(formData.body)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </FormSection>

        <FormActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={template ? 'Update Template' : 'Create Template'}
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </FormModalShell>
  );
}
