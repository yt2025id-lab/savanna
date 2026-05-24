export interface MinipayDetectionResult {
  isMinipay: boolean;
  address: string | null;
}

export function detectMinipayWallet(headers: Record<string, string | undefined>): MinipayDetectionResult {
  const userAgent = headers["user-agent"] || "";
  const minipayAddress = headers["x-minipay-address"] || null;

  const isMinipay =
    userAgent.toLowerCase().includes("minipay") ||
    userAgent.toLowerCase().includes("opera minipay") ||
    minipayAddress !== null;

  return {
    isMinipay,
    address: minipayAddress,
  };
}

export function formatMinipayResponse(isMinipay: boolean, address: string | null): MinipayDetectionResult {
  return { isMinipay, address };
}
