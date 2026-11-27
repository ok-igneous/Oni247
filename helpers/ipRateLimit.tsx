import { createHmac } from "node:crypto";
import { sql } from "kysely";
import { db } from "./db";

export type IpRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * PostgreSQL-backed per-IP/per-route fixed-window limiter.
 * IPs are HMACed with the server secret; raw addresses are never persisted.
 */
export async function checkIpRateLimit(
  ip: string,
  route: string,
  limit: number,
  windowSeconds: number,
): Promise<IpRateLimitResult> {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured before rate limiting can run.");
  }
  const normalizedIp = ip.trim().toLowerCase() || "unknown";
  const keyHash = createHmac("sha256", secret)
    .update(`oni247:rate-limit:v1:${route}:${normalizedIp}`)
    .digest("hex");

  const result = await sql<{ request_count: number; window_started_at: Date }>`
    INSERT INTO request_rate_limits (key_hash, window_started_at, request_count, expires_at)
    VALUES (
      ${keyHash},
      now(),
      1,
      now() + make_interval(secs => ${windowSeconds})
    )
    ON CONFLICT (key_hash) DO UPDATE SET
      request_count = CASE
        WHEN request_rate_limits.window_started_at <= now() - make_interval(secs => ${windowSeconds}) THEN 1
        ELSE request_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN request_rate_limits.window_started_at <= now() - make_interval(secs => ${windowSeconds}) THEN now()
        ELSE request_rate_limits.window_started_at
      END,
      expires_at = now() + make_interval(secs => ${windowSeconds})
    RETURNING request_count, window_started_at
  `.execute(db);

  if (Math.random() < 0.01) {
    void sql`DELETE FROM request_rate_limits WHERE expires_at < now()`.execute(db).catch(() => undefined);
  }

  const row = result.rows[0];
  if (!row) throw new Error("Rate limit state could not be recorded.");
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(row.window_started_at).getTime() + windowSeconds * 1000 - Date.now()) / 1000),
  );
  return {
    allowed: Number(row.request_count) <= limit,
    retryAfterSeconds,
  };
}
