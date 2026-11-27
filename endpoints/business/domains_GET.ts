import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const rows = await sql<{
      id: string; hostname: string; domain_type: string; status: string;
      ssl_status: string; is_primary: boolean; verified_at: Date | null;
      render_verification_status: string; last_error: string | null; last_checked_at: Date | null;
      created_at: Date;
    }>`select d.id, d.hostname, d.domain_type, d.status, d.ssl_status,
             d.is_primary, d.verified_at, d.render_verification_status,
             d.last_error, d.last_checked_at, d.created_at
        from business_domains d
        join businesses b on b.id = d.business_id
       where b.owner_id = ${user.id}
       order by d.is_primary desc, d.created_at asc`.execute(db);
    return new Response(superjson.stringify({ domains: rows.rows }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not authenticated";
    return new Response(superjson.stringify({ error: message }), { status: 401 });
  }
}
