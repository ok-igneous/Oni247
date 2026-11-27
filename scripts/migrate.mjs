import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "database", "migrations");
const db = postgres(databaseUrl, { prepare: false, max: 1, connect_timeout: 15 });

const toStatements = (source) =>
  source
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .replace(/^\s*BEGIN\s*;/im, "")
    .replace(/^\s*COMMIT\s*;/im, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

try {
  await db.unsafe(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
  );

  const files = (await readdir(migrationsDir))
    .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/i, "");
    const existing = await db.unsafe(
      "SELECT version FROM schema_migrations WHERE version = $1 LIMIT 1",
      [version]
    );

    if (existing.length > 0) {
      console.log("Skipping already-applied migration: " + version);
      continue;
    }

    const statements = toStatements(
      await readFile(path.join(migrationsDir, file), "utf8")
    );

    await db.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }
      await tx.unsafe(
        "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
        [version]
      );
    });
    console.log("Applied migration: " + version);
  }
} finally {
  await db.end({ timeout: 5 });
}
