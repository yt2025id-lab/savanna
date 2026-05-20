"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { clsx } from "clsx";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  txHash?: string;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string, txHash?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const addToast = useCallback(
    (type: ToastType, message: string, txHash?: string) => {
      const id = Date.now() + counter++;
      setToasts((prev) => [...prev, { id, type, message, txHash }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "animate-fade-in flex items-start gap-2.5 rounded-lg border p-3 shadow-lg",
              toast.type === "success" && "border-accent/20 bg-accent-dim",
              toast.type === "error" && "border-danger/20 bg-danger-dim",
              toast.type === "info" && "border-info/20 bg-[rgba(59,130,246,0.1)]"
            )}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            )}
            {toast.type === "info" && (
              <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {toast.message}
              </p>
              {toast.txHash && (
                <a
                  href={`https://sepolia.celoscan.io/tx/${toast.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-accent hover:underline"
                >
                  View on Explorer →
                </a>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
