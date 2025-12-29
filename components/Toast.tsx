'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

/**
 * Toast - Modern notification component
 *
 * Features:
 * - Auto-dismisses after duration (default 4s)
 * - Slide-in animation from top
 * - Click to dismiss
 * - Icon based on type
 * - Matches design system colors
 */
export default function Toast({ message, type = 'success', duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation
    setIsVisible(true);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const styles = {
    success: 'bg-green-500/90 text-white border-green-600',
    error: 'bg-destructive/90 text-destructive-foreground border-destructive',
    info: 'bg-blue-500/90 text-white border-blue-600',
    warning: 'bg-yellow-500/90 text-yellow-950 border-yellow-600',
  };

  const icons = {
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        flex items-center gap-3
        px-5 py-4 rounded-lg
        border shadow-lg backdrop-blur-sm
        cursor-pointer
        transition-all duration-300 ease-out
        ${styles[type]}
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
      `}
      onClick={handleClick}
      role="alert"
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {icons[type]}
      </div>

      {/* Message */}
      <div className="flex-1 text-sm font-medium whitespace-pre-line">
        {message}
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
