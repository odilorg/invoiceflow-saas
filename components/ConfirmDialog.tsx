'use client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog - Modern replacement for browser confirm()
 *
 * Features:
 * - Clean, modern design matching app theme
 * - Different types: warning, danger, info
 * - Custom button labels
 * - Keyboard support (Enter/Escape)
 * - Backdrop click to cancel
 *
 * Usage:
 * ```tsx
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * {showConfirm && (
 *   <ConfirmDialog
 *     title="Continue with invalid variables?"
 *     message="Some variables are invalid. Continue anyway?"
 *     type="warning"
 *     onConfirm={() => { proceed(); setShowConfirm(false); }}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 * )}
 * ```
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const iconBg = {
    warning: 'bg-yellow-500/10',
    danger: 'bg-destructive/10',
    info: 'bg-blue-500/10',
  };

  const iconColor = {
    warning: 'text-yellow-500',
    danger: 'text-destructive',
    info: 'text-blue-500',
  };

  const confirmBg = {
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    danger: 'bg-destructive hover:opacity-90',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  const icons = {
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    danger: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-card rounded-lg max-w-md w-full shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="p-6">
          {/* Header with Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg[type]}`}>
              <div className={iconColor[type]}>
                {icons[type]}
              </div>
            </div>
            <h3 id="confirm-title" className="text-lg font-bold text-foreground">
              {title}
            </h3>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p id="confirm-message" className="text-sm text-foreground whitespace-pre-line">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors min-h-[44px]"
              autoFocus
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px] ${confirmBg[type]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
