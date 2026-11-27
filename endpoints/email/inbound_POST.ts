import superjson from "superjson";
import { handleInboundEmail, type InboundEmail } from "../../helpers/handleInboundEmail";
import { inboundSecret } from "../../helpers/emailConfig";
import type { OutputType } from "./inbound_POST.schema";

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : str((x as Record<string, unknown> | null)?.Email ?? (x as Record<string, unknown> | null)?.email))).filter(Boolean) : str(v) ? str(v).split(",").map((s) => s.trim()).filter(Boolean) : [];

const same = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/**
 * Receives replies from any mail forwarder (a small script on your own mail server, Postmark, or a
 * Cloudflare Email Worker). Send JSON: { from, to: [..], subject, text, html, messageId } with the
 * header "x-inbound-secret" set to EMAIL_INBOUND_SECRET. Postmark's inbound shape also works.
 */
export async function handle(request: Request) {
  const done = (status: number, body: unknown) => new Response(superjson.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  try {
    const secret = await inboundSecret();
    if (secret.length < 16) return done(503, { error: "Inbound email is not set up." });
    const given = request.headers.get("x-inbound-secret") ?? "";
    if (!same(given, secret)) return done(401, { error: "Not allowed." });

    const raw = JSON.parse(await request.text()) as Record<string, unknown>;
    const to = [...list(raw.to), ...list(raw.recipients), ...list(raw.ToFull), ...list(raw.To)];
    const email: InboundEmail = {
      from: str(raw.from) || str(raw.From),
      recipients: to,
      subject: str(raw.subject) || str(raw.Subject),
      text: str(raw.text) || str(raw.TextBody),
      html: str(raw.html) || str(raw.HtmlBody),
      messageId: str(raw.messageId) || str(raw.MessageID) || null,
    };
    const filed = await handleInboundEmail(email);
    return done(200, { ok: true, filed } satisfies OutputType);
  } catch {
    return done(400, { error: "Could not read that email." });
  }
}

