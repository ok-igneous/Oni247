import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { fillEmail, parseEmailTemplate, renderEmail } from "../../helpers/emailTemplate";
import { deliverMail } from "../../helpers/deliverMail";
import type { OutputType } from "./test_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

// Sends one test email, looking exactly like a real one, to the owner's own
// login address. With the shop's own provider, a campaign can only be sent
// after this succeeds.
export async function handle(request: Request) {
  let business;
  let ownerEmail: string;
  try {
    const session = await requireOwnedBusiness(request);
    business = session.business;
    ownerEmail = session.user.email;
  } catch {
    return fail("Not authenticated", 401);
  }
  try {
    if (!subscriptionPlan.resolve(business).isPremiumPlus) return fail("The Email engine is included in Premium Plus.", 403);
    const row = (await db.selectFrom("emailSettings").selectAll().where("businessId", "=", business.id).executeTakeFirst()) ?? null;
    const origin = new URL(request.url).origin;
    const rendered = renderEmail({
      business,
      template: parseEmailTemplate(row?.extra),
      origin,
      unsubscribe: false,
      message: `This is a test email from ${business.name}.\n\nYour email settings work, so you can now send emails to your customers. This is how your emails will look.`,
    });
    const vars = { greeting: "there", greetingHtml: "there", unsubscribeUrl: "" };
    const [result] = await deliverMail(row, business.name, business.email, [
      {
        fromName: row?.fromName ?? business.name,
        fromEmail: row?.fromEmail ?? "",
        to: ownerEmail,
        replyTo: row?.replyTo ?? business.email ?? undefined,
        subject: `Test email from ${business.name}`,
        html: fillEmail(rendered.html, vars),
        text: fillEmail(rendered.text, vars),
      },
    ]);
    if (row) {
      await db
        .updateTable("emailSettings")
        .set(result.ok ? { verifiedAt: new Date(), lastError: null } : { verifiedAt: null, lastError: result.error })
        .where("businessId", "=", business.id)
        .execute();
    }
    if (!result.ok) return fail(result.error, 502);
    return new Response(superjson.stringify({ sentTo: ownerEmail } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not send the test email.", 400);
  }
}
