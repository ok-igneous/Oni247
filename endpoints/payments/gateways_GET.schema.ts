import superjson from "superjson";
import type { GatewayProvider } from "../../helpers/paymentProviders";

export type GatewayInfo = {
  provider: GatewayProvider;
  enabled: boolean;
  hasSecret: boolean;
  verified: boolean;
  lastError: string | null;
  webhookUrl: string;
};
export type OutputType = { serverReady: boolean; gateways: GatewayInfo[] };

export const getGateways = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/payments/gateways`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
