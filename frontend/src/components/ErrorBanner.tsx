"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

type ErrorEntry = { id: number; message: string };

let idCounter = 0;
const listeners = new Set<(errors: ErrorEntry[]) => void>();
let currentErrors: ErrorEntry[] = [];

export function showError(message: string) {
  const entry: ErrorEntry = { id: ++idCounter, message };
  currentErrors = [...currentErrors, entry];
  listeners.forEach((fn) => fn(currentErrors));
  setTimeout(() => {
    currentErrors = currentErrors.filter((e) => e.id !== entry.id);
    listeners.forEach((fn) => fn(currentErrors));
  }, 8000);
  return entry.id;
}

export function dismissError(id: number) {
  currentErrors = currentErrors.filter((e) => e.id !== id);
  listeners.forEach((fn) => fn(currentErrors));
}

export function ErrorBanner() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);

  useEffect(() => {
    const handler = (e: ErrorEntry[]) => setErrors([...e]);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const dismiss = useCallback((id: number) => dismissError(id), []);

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 max-w-sm">
      {errors.map((err) => (
        <div
          key={err.id}
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-dim/90 backdrop-blur px-4 py-3 shadow-lg animate-slide-up"
        >
          <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
          <p className="text-xs text-danger flex-1 leading-relaxed line-clamp-3">
            {err.message}
          </p>
          <button
            onClick={() => dismiss(err.id)}
            className="text-danger/60 hover:text-danger shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
