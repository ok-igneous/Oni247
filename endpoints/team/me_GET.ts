import superjson from "superjson";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./me_GET.schema";

export async function handle(request: Request) {
  try {
    const { access } = await requireOwnedBusiness(request);
    return new Response(superjson.stringify({ isOwner: access.isOwner, roleName: access.roleName, permissions: access.permissions } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), { status: 401 });
  }
}

