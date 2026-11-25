import superjson from "superjson";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { schema, type OutputType } from "./save_POST.schema";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

/** Slugs the app itself needs, so a business can never take one. */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "dashboard",
  "login",
  "logout",
  "oniduka",
  "register",
  "setup",
  "store",
  "support",
  "www",
]);

export async function handle(request: Request) {
  let userId: number;
  try {
    const session = await getServerUserSession(request);
    userId = session.user.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    if (RESERVED_SLUGS.has(input.slug)) {
      return new Response(
        superjson.stringify({
          error: "That page address is reserved. Please choose another.",
        }),
        { status: 400 },
      );
    }

    // The owner's existing business comes from the SESSION, never from the
    // request body — there is no id for a client to swap.
    const existing = await db
      .selectFrom("businesses")
      .select(["id", "contentSettings", "plan", "websitePlan", "trialEndsAt", "planRenewsAt"])
      .where("ownerId", "=", userId)
      .limit(1)
      .executeTakeFirst();

    let slugQuery = db
      .selectFrom("businesses")
      .select(["id"])
      .where("slug", "=", input.slug);
    if (existing) {
      slugQuery = slugQuery.where("id", "!=", existing.id);
    }
    const slugTaken = await slugQuery.limit(1).executeTakeFirst();

    if (slugTaken) {
      return new Response(
        superjson.stringify({
          error: "That page address is already taken. Please choose another.",
        }),
        { status: 409 },
      );
    }

    const advancedMediaKeys = ["homepageSlides", "homepageVideoUrl", "homepageVideoFileUrl", "homepageSliderPlacement", "homepageVideoPlacement", "homepageVideoTitle", "homepageVideoDescription", "homepageSliderInterval"];
    if (existing && input.contentSettings && !subscriptionPlan.resolve(existing).canUseAdvancedMedia) {
      const oldSettings = existing.contentSettings && typeof existing.contentSettings === "object" && !Array.isArray(existing.contentSettings) ? existing.contentSettings as Record<string, unknown> : {};
      const nextSettings = input.contentSettings as Record<string, unknown>;
      const changed = advancedMediaKeys.some(key => JSON.stringify(nextSettings[key] ?? null) !== JSON.stringify(oldSettings[key] ?? null));
      if (changed) return new Response(superjson.stringify({ error: "The advanced slider and video tools are Premium Plus features. Your saved media has been retained; upgrade to edit it." }), { status: 402 });
    }

    const values = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoUrl: input.logoUrl,
      ...(input.heroHeadline !== undefined ? { heroHeadline: input.heroHeadline } : {}),
      ...(input.heroSubtext !== undefined ? { heroSubtext: input.heroSubtext } : {}),
      ...(input.heroImageUrl !== undefined ? { heroImageUrl: input.heroImageUrl } : {}),
      ...(input.heroCtaLabel !== undefined ? { heroCtaLabel: input.heroCtaLabel } : {}),
      phone: input.phone,
      whatsappNumber: input.whatsappNumber,
      email: input.email,
      address: input.address,
      openingHours: input.openingHours,
      themeId: input.themeId,
      currency: input.currency,
      status: input.status,
      ...(input.appearanceSettings !== undefined ? { appearanceSettings: input.appearanceSettings } : {}),
      ...(input.contentSettings !== undefined ? { contentSettings: input.contentSettings } : {}),
    };

    const business = existing
      ? await db
          .updateTable("businesses")
          .set({ ...values, updatedAt: new Date() })
          .where("id", "=", existing.id)
          .where("ownerId", "=", userId)
          .returningAll()
          .executeTakeFirstOrThrow()
      : await db
          .insertInto("businesses")
          .values({
            ...values,
            ownerId: userId,
            // The one-time Premium Plus trial begins when the business is first
            // created. Persist the used flag so it cannot be started again.
            plan: "free",
            websitePlan: "one_page",
            premiumTrialUsed: true,
            trialEndsAt: new Date(
              Date.now() + subscriptionPlan.trialDays * 24 * 60 * 60 * 1000,
            ),
          })
          .returningAll()
          .executeTakeFirstOrThrow();

    return new Response(
      superjson.stringify({ business } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save the business.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
