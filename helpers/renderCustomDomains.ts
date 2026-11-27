import { lookup } from "node:dns/promises";
import { connect as tlsConnect } from "node:tls";
import { isIP } from "node:net";

type RenderCustomDomain = {
  id: string;
  name: string;
  verificationStatus: "verified" | "unverified";
};

export type RenderDomainSyncResult = {
  configured: boolean;
  domainId?: string;
  verificationStatus: "not_registered" | "unverified" | "verified" | "error";
  tlsReady: boolean;
  message: string;
};

const config = () => ({
  apiKey: process.env.RENDER_API_KEY?.trim(),
  serviceId: process.env.RENDER_SERVICE_ID?.trim(),
});

class RenderApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "RenderApiError";
  }
}

const requestRender = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { apiKey } = config();
  if (!apiKey) throw new Error("RENDER_API_KEY is not configured.");
  const response = await fetch(`https://api.render.com/v1${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(15000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new RenderApiError(
      response.status,
      `Render API request failed (HTTP ${response.status}): ${text.slice(0, 500)}`,
    );
  }
  return (text ? JSON.parse(text) : null) as T;
};

export const isPublicAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 0 || b === 168)) return false;
    if (a === 192 && b === 0 && parts[2] === 2) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0 && parts[2] === 113) return false;
    return true;
  }
  if (family === 6) {
    const first = Number.parseInt(address.split(":")[0] || "0", 16);
    return first >= 0x2000 && first <= 0x3fff && !address.toLowerCase().startsWith("2001:db8:");
  }
  return false;
};

const tlsHandshake = (hostname: string, address: string): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = tlsConnect({
      host: address,
      port: 443,
      servername: hostname,
      rejectUnauthorized: true,
      timeout: 7000,
    });
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ready);
    };
    socket.once("secureConnect", () => finish(socket.authorized));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });

/** Probe a public address directly to avoid following a customer-controlled DNS target into private networks. */
export async function isRenderTlsReady(hostname: string): Promise<boolean> {
  let addresses: Array<{ address: string; family: number }> = [];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return false;
  }
  for (const entry of addresses) {
    if (!isPublicAddress(entry.address)) continue;
    if (await tlsHandshake(hostname, entry.address)) return true;
  }
  return false;
}

export async function registerRenderCustomDomain(hostname: string): Promise<RenderCustomDomain> {
  const { serviceId } = config();
  if (!serviceId) throw new Error("RENDER_SERVICE_ID is not configured.");
  try {
    const result = await requestRender<RenderCustomDomain[]>(
      `/services/${encodeURIComponent(serviceId)}/custom-domains`,
      { method: "POST", body: JSON.stringify({ name: hostname }) },
    );
    const domain = Array.isArray(result) ? result[0] : undefined;
    if (!domain?.id || !domain.name) throw new Error("Render did not return a custom-domain resource.");
    return domain;
  } catch (error) {
    // Recover safely if Render created the resource but the caller lost the response.
    const existing = await getRenderCustomDomain(hostname).catch(() => null);
    if (existing?.id) return existing;
    throw error;
  }
}

export async function getRenderCustomDomain(hostnameOrId: string): Promise<RenderCustomDomain> {
  const { serviceId } = config();
  if (!serviceId) throw new Error("RENDER_SERVICE_ID is not configured.");
  return requestRender<RenderCustomDomain>(
    `/services/${encodeURIComponent(serviceId)}/custom-domains/${encodeURIComponent(hostnameOrId)}`,
  );
}

export async function requestRenderDomainVerification(hostnameOrId: string): Promise<void> {
  const { serviceId } = config();
  if (!serviceId) throw new Error("RENDER_SERVICE_ID is not configured.");
  await requestRender(
    `/services/${encodeURIComponent(serviceId)}/custom-domains/${encodeURIComponent(hostnameOrId)}/verify`,
    { method: "POST" },
  );
}

export async function deleteRenderCustomDomain(hostnameOrId: string): Promise<void> {
  const { serviceId } = config();
  if (!serviceId) throw new Error("RENDER_SERVICE_ID is not configured.");
  try {
    await requestRender(
      `/services/${encodeURIComponent(serviceId)}/custom-domains/${encodeURIComponent(hostnameOrId)}`,
      { method: "DELETE" },
    );
  } catch (error) {
    // Deletion is idempotent: a previous attempt may have removed the Render
    // resource before the local database transaction failed.
    if (error instanceof RenderApiError && error.status === 404) return;
    throw error;
  }
}

export async function syncRenderCustomDomain(
  hostname: string,
  existingRenderId?: string | null,
): Promise<RenderDomainSyncResult> {
  const { apiKey, serviceId } = config();
  if (!apiKey || !serviceId) {
    return {
      configured: false, verificationStatus: "not_registered", tlsReady: false,
      message: "Render domain automation is not configured. Set RENDER_API_KEY and RENDER_SERVICE_ID on the Oni247 server.",
    };
  }
  try {
    const domain = existingRenderId
      ? await getRenderCustomDomain(existingRenderId)
      : await registerRenderCustomDomain(hostname);
    if (domain.verificationStatus === "unverified") {
      await requestRenderDomainVerification(domain.id);
    }
    const tlsReady = domain.verificationStatus === "verified"
      ? await isRenderTlsReady(hostname)
      : false;
    return {
      configured: true,
      domainId: domain.id,
      verificationStatus: domain.verificationStatus,
      tlsReady,
      message: domain.verificationStatus !== "verified"
        ? "Render has registered the domain but has not verified its DNS yet."
        : tlsReady
          ? "Render DNS verification and HTTPS certificate checks passed."
          : "Render verified the domain. Its HTTPS certificate is not ready yet; check again shortly.",
    };
  } catch (error) {
    return {
      configured: true, verificationStatus: "error", tlsReady: false,
      message: error instanceof Error ? error.message : "Render domain synchronization failed.",
    };
  }
}
