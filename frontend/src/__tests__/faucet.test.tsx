import "@testing-library/jest-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const wagmiMocks = {
  useAccount: vi.fn<() => { address: `0x${string}` | undefined; isConnected: boolean }>(() => ({ address: undefined, isConnected: false })),
  useWriteContract: vi.fn<() => {
    writeContract: (...args: unknown[]) => void;
    data: `0x${string}` | undefined;
    isPending: boolean;
    error: Error | null;
    reset: () => void;
  }>(() => ({
    writeContract: vi.fn(), data: undefined, isPending: false, error: null, reset: vi.fn(),
  })),
  useWaitForTransactionReceipt: vi.fn<() => { isLoading: boolean; isSuccess: boolean }>(() => ({ isLoading: false, isSuccess: false })),
};

const authMocks = {
  useAuth: vi.fn<() => { isAuthed: boolean; address: `0x${string}` | null; isConnected: boolean; ready: boolean; login: () => void }>(() => ({
    isAuthed: false, address: null, isConnected: false, ready: true, login: vi.fn(),
  })),
};

vi.mock("wagmi", () => ({
  get useAccount() { return wagmiMocks.useAccount; },
  get useWriteContract() { return wagmiMocks.useWriteContract; },
  get useWaitForTransactionReceipt() { return wagmiMocks.useWaitForTransactionReceipt; },
}));

vi.mock("@/components/AuthModal", () => ({
  get useAuth() { return authMocks.useAuth; },
}));

import FaucetPage from "@/app/faucet/page";

afterEach(() => {
  cleanup();
  localStorage.clear();
  wagmiMocks.useAccount.mockImplementation(() => ({ address: undefined, isConnected: false }));
  wagmiMocks.useWriteContract.mockImplementation(() => ({
    writeContract: vi.fn(), data: undefined, isPending: false, error: null, reset: vi.fn(),
  }));
  wagmiMocks.useWaitForTransactionReceipt.mockImplementation(() => ({ isLoading: false, isSuccess: false }));
  authMocks.useAuth.mockImplementation(() => ({ isAuthed: false, address: null, isConnected: false, ready: true, login: vi.fn() }));
});

describe("FaucetPage", () => {
  it("renders title, how-it-works, and connect-state", () => {
    render(<FaucetPage />);
    expect(screen.getByText("Token Faucet")).toBeInTheDocument();
    expect(screen.getByText(/Claim free test tokens every 24 hours/i)).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Connect & Sign")).toBeInTheDocument();
    expect(screen.getAllByText("Connect")).toHaveLength(4);
  });

  it("shows claim buttons and token names when authed", () => {
    wagmiMocks.useAccount.mockImplementation(() => ({ address: "0xabc", isConnected: true }));
    authMocks.useAuth.mockImplementation(() => ({ isAuthed: true, address: "0xabc", isConnected: true, ready: true, login: vi.fn() }));
    render(<FaucetPage />);
    expect(screen.getByText("Claim USDC")).toBeInTheDocument();
    expect(screen.getByText("Claim cbBTC")).toBeInTheDocument();
    expect(screen.getByText("Claim cbETH")).toBeInTheDocument();
    expect(screen.getByText("USD Coin")).toBeInTheDocument();
    expect(screen.getByText("Coinbase BTC")).toBeInTheDocument();
    expect(screen.getByText("Coinbase ETH")).toBeInTheDocument();
    expect(screen.getByText("Claimed")).toBeInTheDocument();
  });

  it("shows cooldown timer after claiming", () => {
    const addr = "0xabc";
    localStorage.setItem(`savanna-faucet-USDC-${addr}`, String(Date.now() + 86400000));
    wagmiMocks.useAccount.mockImplementation(() => ({ address: addr, isConnected: true }));
    authMocks.useAuth.mockImplementation(() => ({ isAuthed: true, address: addr, isConnected: true, ready: true, login: vi.fn() }));
    render(<FaucetPage />);
    expect(screen.getByText(/h \d+m \d+s/)).toBeInTheDocument();
  });

  it("shows claimed count when authed", () => {
    const addr = "0xabc";
    localStorage.setItem(`savanna-faucet-claimed-${addr}`, "3");
    wagmiMocks.useAccount.mockImplementation(() => ({ address: addr, isConnected: true }));
    authMocks.useAuth.mockImplementation(() => ({ isAuthed: true, address: addr, isConnected: true, ready: true, login: vi.fn() }));
    render(<FaucetPage />);
    expect(screen.getByText("Claimed")).toBeInTheDocument();
  });
});
