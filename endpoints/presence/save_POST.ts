import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./save_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  let canEdit: boolean;
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
    canEdit = subscriptionPlan.resolve(business).canEditPresence;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  if (!canEdit) {
    return new Response(
      superjson.stringify({
        error: "Testimonials and portfolio are part of Premium.",
      }),
      { status: 402 },
    );
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    if (input.kind === "testimonial") {
      const values = {
        authorName: input.authorName,
        authorRole: input.authorRole,
        quote: input.quote,
        rating: input.rating ?? null,
        published: input.published,
        sortOrder: input.sortOrder,
        // Older app versions do not send a picture; keep the saved one for them.
        ...(json && typeof json === "object" && "imageUrl" in json ? { imageUrl: input.imageUrl } : {}),
      };
      const row = input.id
        ? await db
            .updateTable("testimonials")
            .set({ ...values, updatedAt: new Date() })
            .where("id", "=", input.id)
            .where("businessId", "=", businessId)
            .returning(["id"])
            .executeTakeFirst()
        : await db
            .insertInto("testimonials")
            .values({ ...values, businessId })
            .returning(["id"])
            .executeTakeFirstOrThrow();
      if (!row) {
        return new Response(
          superjson.stringify({ error: "Testimonial not found." }),
          { status: 404 },
        );
      }
    } else {
      const values = {
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl,
        sortOrder: input.sortOrder,
      };
      const row = input.id
        ? await db
            .updateTable("portfolioItems")
            .set({ ...values, updatedAt: new Date() })
            .where("id", "=", input.id)
            .where("businessId", "=", businessId)
            .returning(["id"])
            .executeTakeFirst()
        : await db
            .insertInto("portfolioItems")
            .values({ ...values, businessId })
            .returning(["id"])
            .executeTakeFirstOrThrow();
      if (!row) {
        return new Response(
          superjson.stringify({ error: "Portfolio item not found." }),
          { status: 404 },
        );
      }
    }

    return new Response(
      superjson.stringify({ saved: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}