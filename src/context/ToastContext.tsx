import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-800 border-green-600 text-green-100',
  error:   'bg-red-800 border-red-600 text-red-100',
  warning: 'bg-yellow-800 border-yellow-600 text-yellow-100',
  info:    'bg-gray-700 border-gray-500 text-gray-100',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]); // cap at 4 toasts
    const timer = setTimeout(() => dismiss(id), 4000);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — sits above everything, below the record button */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-lg text-sm max-w-xs w-max pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 ${COLORS[toast.type]}`}
          >
            <span className="font-bold shrink-0">{ICONS[toast.type]}</span>
            <span>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="ml-1 opacity-60 hover:opacity-100 transition-opacity shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
