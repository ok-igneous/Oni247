import { Kysely, CamelCasePlugin, sql, type Transaction } from "kysely";
import { AsyncLocalStorage } from "node:async_hooks";
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

const postgresClient = postgres(databaseUrl, {
  prepare: false,
  idle_timeout: 10,
  connect_timeout: 15,
  max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
});

const baseDb = new Kysely<DB>({
  plugins: [new Oni247CamelCasePlugin()],
  dialect: new PostgresJSDialect({ postgres: postgresClient }),
});

const requestTransaction = new AsyncLocalStorage<Transaction<DB>>();
let nestedSavepointSequence = 0;

/**
 * All database operations inside a user request transparently use its one
 * transaction/connection. Outside that scope they use the base pool.
 */
export const db = new Proxy(baseDb, {
  get(target, property) {
    const active = requestTransaction.getStore() ?? target;

    // Kysely Transaction does not expose Kysely.transaction(). Existing
    // endpoint handlers use db.transaction() for atomic multi-step writes.
    // When already inside a request transaction, emulate nested transactions
    // with PostgreSQL savepoints on that same connection/context.
    if (property === "transaction" && active !== target) {
      return () => ({
        execute: async <T,>(callback: (trx: Transaction<DB>) => Promise<T>): Promise<T> => {
          const savepoint = `oni_nested_${++nestedSavepointSequence}`;
          await sql.raw(`SAVEPOINT "${savepoint}"`).execute(active);
          try {
            const result = await callback(active as Transaction<DB>);
            await sql.raw(`RELEASE SAVEPOINT "${savepoint}"`).execute(active);
            return result;
          } catch (error) {
            await sql.raw(`ROLLBACK TO SAVEPOINT "${savepoint}"`).execute(active);
            await sql.raw(`RELEASE SAVEPOINT "${savepoint}"`).execute(active);
            throw error;
          }
        },
      }) as ReturnType<Kysely<DB>["transaction"]>;
    }

    const value = Reflect.get(active, property, active);
    return typeof value === "function" ? value.bind(active) : value;
  },
}) as Kysely<DB>;

/**
 * The caller must supply an ID obtained from a verified server-side session,
 * never from request parameters, headers, or body.
 */
export async function withUserDatabaseContext<T>(
  userId: number,
  callback: () => Promise<T>,
): Promise<T> {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("A verified positive user ID is required for database context.");
  }

  return baseDb.transaction().execute(async (trx) => {
    await sql`select set_config('app.user_id', ${String(userId)}, true)`.execute(trx);
    return requestTransaction.run(trx, callback);
  });
}

export async function closeDatabase(): Promise<void> {
  await baseDb.destroy();
}
