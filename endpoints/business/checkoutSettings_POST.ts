import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { parseCheckoutSettings } from "../../helpers/parseCheckoutSettings";
import { schema, type OutputType } from "./checkoutSettings_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const input = schema.parse(superjson.parse(await request.text()));

    if (input.paymentMethods.bankTransfer && input.bank.accountNumber.length === 0) {
      return new Response(
        superjson.stringify({ error: "Add your bank account number to offer bank transfer." }),
        { status: 400 },
      );
    }
    if (!input.deliveryEnabled && !input.pickupEnabled) {
      return new Response(
        superjson.stringify({ error: "Turn on delivery, pickup, or both." }),
        { status: 400 },
      );
    }

    // Settings are stored in the normalised shape so reads and writes agree.
    const settings = parseCheckoutSettings(input);

    await db
      .updateTable("businesses")
      .set({ checkoutSettings: settings, updatedAt: new Date() })
      .where("id", "=", businessId)
      .execute();

    return new Response(superjson.stringify({ settings } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save your settings.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
