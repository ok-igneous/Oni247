import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { isAddonEnabled } from "../../helpers/addons";
import { platformSenderReady } from "../../helpers/emailConfig";
import { dropOptedOut, loadCustomers, loadEventPeople } from "../../helpers/emailAudience";
import type { OutputType } from "./overview_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const plan = subscriptionPlan.resolve(business);
    const appearance = (business.appearanceSettings ?? {}) as Record<string, unknown>;
    const settings = await db.selectFrom("emailSettings").select(["provider", "verifiedAt"]).where("businessId", "=", business.id).executeTakeFirst();
    const usesPlatform = !settings || settings.provider === "platform";
    const sendingReady = usesPlatform ? await platformSenderReady() : Boolean(settings?.verifiedAt);
    const canSend = plan.isPremiumPlus && isAddonEnabled(appearance, "email") && sendingReady;

    const customers = await dropOptedOut(business.id, await loadCustomers(business.id));
    const events = await db
      .selectFrom("events")
      .select(["id", "title", "startsAt"])
      .where("businessId", "=", business.id)
      .orderBy("startsAt", "desc")
      .limit(30)
      .execute();
    const eventOptions: OutputType["events"] = [];
    for (const event of events) {
      const loaded = await loadEventPeople(business.id, event.id);
      const kept = (await dropOptedOut(business.id, loaded.people)).people;
      eventOptions.push({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        all: kept.length,
        approved: kept.filter((p) => p.status === "approved").length,
      });
    }
    const campaigns = await db
      .selectFrom("emailCampaigns")
      .select(["id", "subject", "message", "audienceLabel", "recipientCount", "sentCount", "failedCount", "error", "createdAt"])
      .where("businessId", "=", business.id)
      .orderBy("createdAt", "desc")
      .limit(10)
      .execute();

    const output: OutputType = { sendingReady, canSend, customers: customers.people.length, events: eventOptions, campaigns };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(
      superjson.stringify({ error: noBusiness ? "Create your business page first." : "Not authenticated" }),
      { status: noBusiness ? 400 : 401 },
    );
  }
}
