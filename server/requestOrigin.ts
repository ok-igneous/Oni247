/**
 * Checks browser mutation origins against the public request origin.
 *
 * The Next.js proxy forwards the original host/protocol in these headers.
 * Fastify is bound to loopback, so these forwarded values are supplied by the
 * trusted in-process proxy rather than directly by internet clients.
 */
export function isSameOriginMutation(
  originHeader: string,
  protocol: string,
  hostHeader: string | string[] | undefined,
  forwardedHostHeader: string | string[] | undefined,
  forwardedProtoHeader: string | string[] | undefined,
): boolean {
  const singleHeader = (value: string | string[] | undefined): string | undefined =>
    typeof value === "string" && value.length > 0 && !value.includes(",")
      ? value.trim()
      : undefined;

  const forwardedHost = singleHeader(forwardedHostHeader);
  const forwardedProto = singleHeader(forwardedProtoHeader);
  const host = forwardedHost ?? singleHeader(hostHeader);
  const scheme = (forwardedProto ?? protocol).toLowerCase();

  if (!host || !["http", "https"].includes(scheme) || /[\\/@\\s]/.test(host)) {
    return false;
  }

  try {
    const expectedOrigin = new URL(`${scheme}://${host}`).origin;
    return new URL(originHeader).origin === expectedOrigin;
  } catch {
    return false;
  }
}
