"use client";

import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { SiweMessage } from "siwe";
import { LogoMark } from "@/components/landing/Icons";
import { Shield, Fingerprint, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Auth Context — provides auth state across the app                 */
/* ------------------------------------------------------------------ */

let _isAuthed = false;
let _authAddress: string | null = null;
const _listeners: Set<() => void> = new Set();

function notify() {
  _listeners.forEach((l) => l());
}

export function getAuthState() {
  return { isAuthed: _isAuthed, address: _authAddress };
}

export function setAuthed(address: string) {
  _isAuthed = true;
  _authAddress = address;
  notify();
}

export function clearAuth() {
  _isAuthed = false;
  _authAddress = null;
  notify();
}

export function subscribeAuth(listener: () => void) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/*  AuthGuard — wraps pages that require authentication                */
/* ------------------------------------------------------------------ */
export function useAuth() {
  const { address, isConnected } = useAccount();
  const [authed, setAuthed] = useState(_isAuthed);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeAuth(() => setAuthed(_isAuthed));
    return () => { unsub; };
  }, []);

  useEffect(() => {
    if (isConnected && address && !_isAuthed) {
      setShowModal(true);
    }
    if (!isConnected) {
      setShowModal(false);
      clearAuth();
      setAuthed(false);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (_isAuthed && _authAddress === address) {
      setShowModal(false);
    }
  }, [authed, address]);

  return {
    isAuthed: authed && _authAddress === address,
    showModal,
    setShowModal,
  };
}

/* ------------------------------------------------------------------ */
/*  SignInModal — premium SIWE overlay                                 */
/* ------------------------------------------------------------------ */
export function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [step, setStep] = useState<"connect" | "sign" | "verifying" | "done">("sign");
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(isConnected ? "sign" : "connect");
      setError(null);
    }
  }, [open, isConnected]);

  const handleSign = useCallback(async () => {
    if (!address) return;
    setStep("verifying");
    setError(null);

    try {
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Savanna Finance — prove you own this wallet. No gas will be charged.",
        uri: window.location.origin,
        version: "1",
        chainId: 11142220,
        nonce: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
        issuedAt: new Date().toISOString(),
      });

      const signature = await signMessageAsync({ message: message.prepareMessage() });

      // In production, verify server-side. For now, client-side only.
      setAuthed(address);
      setStep("done");

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signature failed";
      if (msg.includes("User rejected") || msg.includes("denied")) {
        setError("Signature rejected. Please try again.");
      } else {
        setError(msg.slice(0, 100));
      }
      setStep("sign");
    }
  }, [address, signMessageAsync, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md animate-fade-in"
        onClick={step !== "verifying" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Gradient border wrapper */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-br from-accent/60 via-info/40 to-accent/20">
          <div className="rounded-2xl bg-[#0D1A0F] p-8">
            {/* Top icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-info/10 border border-accent/20 relative">
              {step === "verifying" ? (
                <Loader2 className="h-7 w-7 text-accent animate-spin" />
              ) : step === "done" ? (
                <CheckCircle2 className="h-7 w-7 text-[#22c55e]" />
              ) : (
                <Shield className="h-7 w-7 text-accent" />
              )}
              {/* Decorative ring */}
              <div className="absolute inset-0 rounded-2xl border border-accent/10 animate-pulse-glow" />
            </div>

            {/* Title */}
            <h3 className="text-center text-lg font-bold text-foreground mb-1.5">
              {step === "done" ? "Welcome to Savanna" : "Sign in to continue"}
            </h3>
            <p className="text-center text-xs text-muted-light leading-relaxed mb-6">
              {step === "connect"
                ? "Connect your wallet first, then sign a message to access your dashboard."
                : step === "done"
                ? "Authentication successful. Redirecting…"
                : "Sign a message to prove wallet ownership. No gas will be charged."}
            </p>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <StepDot
                label="Connect"
                active={step === "connect"}
                done={step !== "connect"}
                icon={<Fingerprint className="h-3 w-3" />}
              />
              <div className="h-px w-8 bg-border" />
              <StepDot
                label="Sign"
                active={step === "sign"}
                done={step === "verifying" || step === "done"}
                icon={<Shield className="h-3 w-3" />}
              />
              <div className="h-px w-8 bg-border" />
              <StepDot
                label="Done"
                active={step === "done"}
                done={step === "done"}
                icon={<CheckCircle2 className="h-3 w-3" />}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-xl bg-danger-dim px-3 py-2 text-[11px] text-danger text-center">
                {error}
              </div>
            )}

            {/* Action buttons */}
            {step === "connect" && (
              <div className="text-center">
                <p className="text-[11px] text-muted mb-3">Connect your wallet using the button in the navbar</p>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2 text-xs text-muted-light hover:border-accent/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {step === "sign" && (
              <button
                onClick={handleSign}
                className="group w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-background transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
              >
                <Shield className="h-4 w-4" />
                Sign Message
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            {step === "verifying" && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/10 py-3 text-sm text-accent">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </div>
            )}

            {step === "done" && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-[#22c55e]/10 py-3 text-sm font-semibold text-[#22c55e]">
                <CheckCircle2 className="h-4 w-4" />
                Authenticated
              </div>
            )}

            {/* Footer */}
            <p className="mt-4 text-center text-[10px] text-muted leading-relaxed">
              By continuing, you agree to sign an off-chain message that proves ownership of your wallet.
            </p>

            {/* Disconnect option */}
            {isConnected && step === "sign" && (
              <button
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                className="mt-3 w-full text-center text-[10px] text-muted hover:text-danger transition-colors"
              >
                Disconnect wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Dot                                                           */
/* ------------------------------------------------------------------ */
function StepDot({ label, active, done, icon }: { label: string; active: boolean; done: boolean; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          done
            ? "bg-accent text-background"
            : active
            ? "bg-accent/20 text-accent border border-accent/40"
            : "bg-card text-muted border border-border"
        }`}
      >
        {icon}
      </div>
      <span className={`text-[9px] ${done ? "text-accent" : active ? "text-foreground" : "text-muted"}`}>
        {label}
      </span>
    </div>
  );
}
