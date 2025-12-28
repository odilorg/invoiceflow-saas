'use client';

import { useState, useEffect } from 'react';

interface HelpBoxProps {
  title?: string;
  items: (string | React.ReactNode)[];
  storageKey?: string;
  defaultOpen?: boolean;
  variant?: 'collapsible' | 'inline';
}

export default function HelpBox({
  title = 'How it works',
  items,
  storageKey,
  defaultOpen = false,
  variant = 'collapsible'
}: HelpBoxProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (storageKey) {
      // Check if user has seen this help box before
      const stored = localStorage.getItem(storageKey);
      if (stored === null) {
        // First time visitor - show help by default
        setIsOpen(true);
      } else {
        // Returning visitor - respect their preference
        setIsOpen(stored === 'true');
      }
    }
  }, [storageKey]);

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (storageKey) {
      localStorage.setItem(storageKey, String(newState));
    }
  };

  // Inline variant - always visible, no toggle
  if (variant === 'inline') {
    return (
      <div className="flex items-start gap-2 text-sm text-slate-600 mb-4">
        <svg className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="space-y-1">
          {items.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      </div>
    );
  }

  // Collapsible variant
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg mb-4">
      <button
        onClick={toggleOpen}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        type="button"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {title}
        </span>
        {isOpen ? (
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-3">
          <ul className="space-y-1.5 text-sm text-slate-600">
            {items.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="text-slate-400 mr-2">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}