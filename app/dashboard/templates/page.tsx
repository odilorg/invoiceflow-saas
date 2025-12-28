'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HelpBox from '@/components/HelpBox';
import UsageCounter from '@/components/UsageCounter';
import { HELP_CONTENT } from '@/lib/help-content';

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

  useEffect(() => {
    loadData();
  }, []);

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
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-sm text-slate-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 pb-32">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900">Email Templates</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </button>
        </div>
        <p className="text-sm text-slate-600">Manage your follow-up email templates</p>
      </div>

      {/* Help Box */}
      <HelpBox
        title={HELP_CONTENT.templates.title}
        items={HELP_CONTENT.templates.items}
        variant={HELP_CONTENT.templates.variant}
      />

      {/* Usage Counter */}
      {usage && (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-4">
          <UsageCounter
            used={usage.templates.used}
            limit={usage.templates.limit}
            label="Templates"
          />
        </div>
      )}

      {/* Variable Reference */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Available Template Variables:</h3>
        <div className="flex flex-wrap gap-2">
          {['{clientName}', '{invoiceNumber}', '{amount}', '{currency}', '{dueDate}', '{invoiceLink}', '{daysOverdue}'].map((v) => (
            <code key={v} className="px-2 py-1 bg-white border border-blue-200 rounded text-xs font-mono text-blue-900">
              {v}
            </code>
          ))}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg p-8 lg:p-12 text-center border border-slate-200">
          <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No templates yet</h3>
          <p className="text-sm text-slate-600 mb-4">Create your first reminder in under a minute.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors font-medium min-h-[44px]"
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
              <div key={template.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                {/* Header with tone indicator */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{toneInfo.emoji}</span>
                      <h3 className="text-lg font-bold text-slate-900">{template.name}</h3>
                      {template.isDefault && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 italic">{toneInfo.description}</p>
                  </div>

                  {/* Three-dot menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === template.id ? null : template.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Template actions"
                    >
                      <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {menuOpen === template.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                          <button
                            onClick={() => {
                              setPreviewTemplate(template);
                              setMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDuplicate(template);
                              setMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(template);
                              setMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                            disabled={template.isDefault}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {template.isDefault ? 'Cannot delete (Default)' : 'Delete'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Usage context */}
                <div className="mb-3">
                  {usage.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      ⚠️ Not used in any schedule
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {usage.map((u, i) => (
                        <p key={i} className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                          ✓ Used on: Day {u.dayOffset} {u.dayOffset === 0 ? '(Due Date)' : u.dayOffset > 0 ? '(Overdue)' : '(Before Due)'} in {u.scheduleName}
                        </p>
                      ))}
                      {activeUsage.length > 0 && (
                        <p className="text-xs text-slate-600">
                          Active in {activeUsage.length} schedule{activeUsage.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Content preview */}
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Subject</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{template.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Body Preview</p>
                  <p className="text-sm text-slate-500 line-clamp-3">{template.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile FAB with better positioning */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 transition-colors z-30"
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Preview: {template.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            💡 Variables shown with sample data. Actual emails will use real invoice data.
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Subject Line</label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
              {subjectParts.map((part, i) => (
                part.isVar ? (
                  <span key={i} className="bg-yellow-200 px-1 py-0.5 rounded font-semibold">
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Body</label>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm whitespace-pre-wrap">
              {bodyParts.map((part, i) => (
                part.isVar ? (
                  <span key={i} className="bg-yellow-200 px-1 py-0.5 rounded font-semibold">
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors min-h-[44px]"
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
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Template?</h3>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <strong>{template.name}</strong>?
            </p>

            {scheduleCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-semibold">
                  ⚠️ Warning: This template is used in {scheduleCount} active schedule{scheduleCount !== 1 ? 's' : ''}.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Deleting it may affect your automated follow-up emails.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors min-h-[44px]"
            >
              Delete Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Modal (Edit/Create) - keeping existing implementation with validation
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body'>('subject');
  const [invalidVars, setInvalidVars] = useState<string[]>([]);
  const subjectRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (invalidVars.length > 0) {
      if (!confirm(`Warning: Invalid variables detected: ${invalidVars.join(', ')}. Continue anyway?`)) {
        return;
      }
    }

    setLoading(true);
    setError('');
    setUpgradeRequired(false);

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
        setError(data.error || 'Failed to save template');
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
        }
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Click variable tokens below to insert them into subject or body
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium mb-1">{error}</p>
                  {upgradeRequired && (
                    <p className="text-red-600 text-xs">
                      Upgrade your plan to create more templates and unlock additional features.
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

          {invalidVars.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-semibold mb-1">
                ⚠️ Invalid variables detected:
              </p>
              <p className="text-xs text-amber-700">
                {invalidVars.map(v => `{${v}}`).join(', ')} - these will not be replaced in emails
              </p>
            </div>
          )}

          {/* Variable Tokens */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Click to Insert Variable
            </label>
            <div className="flex flex-wrap gap-2">
              {variables.map(({ name, example }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => insertVariable(name)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-mono hover:bg-slate-100 hover:border-slate-400 transition-colors min-h-[36px]"
                  title={`Example: ${example}`}
                >
                  {`{${name}}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 Focus the Subject or Body field first, then click a variable to insert it at cursor position
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Template Name *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm min-h-[44px]"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Friendly Reminder"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject Line *</label>
            <input
              ref={subjectRef}
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm min-h-[44px]"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              onFocus={() => setLastFocusedField('subject')}
              placeholder="e.g., Reminder: Invoice {invoiceNumber} due soon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Body *</label>
            <textarea
              ref={bodyRef}
              required
              rows={8}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono text-sm"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              onFocus={() => setLastFocusedField('body')}
              placeholder="Hi {clientName},&#10;&#10;This is a friendly reminder that invoice {invoiceNumber} for {currency} {amount} is due on {dueDate}.&#10;&#10;Best regards"
            />
          </div>

          {/* Preview Toggle */}
          {(formData.subject || formData.body) && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2 min-h-[36px]"
              >
                {showPreview ? '▼' : '▶'} Preview with sample data
              </button>

              {showPreview && (
                <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <p className="text-xs text-slate-500 italic">
                    Variables replaced with sample data (preview only)
                  </p>
                  {formData.subject && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Subject:</p>
                      <p className="text-sm text-slate-900">{renderPreview(formData.subject)}</p>
                    </div>
                  )}
                  {formData.body && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Body:</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{renderPreview(formData.body)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors min-h-[44px]"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
