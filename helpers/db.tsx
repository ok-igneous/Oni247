import { Kysely, CamelCasePlugin } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import { DB, kyselyIdentifierOverrides } from "./schema";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Configure your standalone PostgreSQL connection.");
}

// Kysely's default camel-case conversion loses underscores immediately before
// digits. Keep the generated schema's explicit overrides for those columns.
class Oni247CamelCasePlugin extends CamelCasePlugin {
  protected override snakeCase(str: string): string {
    return kyselyIdentifierOverrides[str] ?? super.snakeCase(str);
  }
}

const sql = postgres(databaseUrl, {
  prepare: false,
  idle_timeout: 10,
  connect_timeout: 15,
  max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
});

export const db = new Kysely<DB>({
  plugins: [new Oni247CamelCasePlugin()],
  dialect: new PostgresJSDialect({ postgres: sql }),
});

export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
