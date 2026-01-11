'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from './Toast';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 4000) => {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 pointer-events-none">
          <div className="flex flex-col gap-2 pointer-events-auto">
            {toasts.map((toast, index) => (
              <div
                key={toast.id}
                style={{
                  transform: `translateY(${index * 4}px)`,
                  transition: 'transform 0.3s ease-out'
                }}
              >
                <Toast
                  message={toast.message}
                  type={toast.type}
                  duration={toast.duration}
                  onClose={() => removeToast(toast.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
