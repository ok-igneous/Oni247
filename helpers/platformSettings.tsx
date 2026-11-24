import { db } from "./db";
import type { Json } from "./schema";

/**
 * The Oni247 admin's own settings (mail server, subscription gateway, plan prices, add-ons),
 * kept in the app's own database so nothing depends on the hosting platform. Backend only.
 * Reads are cached for a few seconds per server instance; a save refreshes this instance at once.
 */
const TTL_MS = 15_000;
const cache = new Map<string, { at: number; value: unknown }>();

export const platformSettings = {
  async get<T>(key: string): Promise<T | null> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T | null;
    const row = await db.selectFrom("platformSettings").select("value").where("key", "=", key).executeTakeFirst();
    const value = (row?.value ?? null) as T | null;
    cache.set(key, { at: Date.now(), value });
    return value;
  },
  async set(key: string, value: unknown): Promise<void> {
    await db
      .insertInto("platformSettings")
      .values({ key, value: value as Json })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value: value as Json, updatedAt: new Date() }))
      .execute();
    cache.set(key, { at: Date.now(), value });
  },
};

