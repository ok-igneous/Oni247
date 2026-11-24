# PostgreSQL migration and cutover

The live database is the source of truth for the production schema and customer data. The generated Kysely types in `helpers/schema.tsx` are not a replacement for a database dump.

## Credentials

Use two credentials supplied securely at migration time:

- `SOURCE_DATABASE_URL`: the authorized read/export connection for the current production database.
- `DATABASE_URL`: the standalone destination database connection used by Oni247.

Never commit either value. Do not copy a Floot credential into `.env.example` or GitHub.

## Initial rehearsal

Create a fresh, empty PostgreSQL database for the standalone application. Then take a custom-format backup and restore it:

```bash
pg_dump --format=custom --no-owner --no-privileges "$SOURCE_DATABASE_URL" --file=oni247-source.dump
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$DATABASE_URL" oni247-source.dump
```

Keep the dump in encrypted, access-controlled storage. Do not upload it to the public repository.

## Verification before cutover

Compare source and destination:

- PostgreSQL version and installed extensions.
- Schemas, tables, columns, data types, enum values and defaults.
- Primary keys, foreign keys, unique constraints and indexes.
- Row counts for every application and authentication table.
- Sequences/identity counters and referential integrity.
- Authentication sessions, verification/reset tokens, subscriptions, orders, payments, email settings and media metadata.

Run representative application reads and writes against the destination. Verify tenant isolation with two unrelated business accounts.

## Final cutover

A rehearsal dump is not the final production migration. Data written after that snapshot will be missing.

1. Complete the initial restore and test against a copy.
2. Schedule a short write freeze for the final migration, or design and verify a safe change-data-capture/delta process.
3. Take and restore the final consistent dump.
4. Re-run integrity checks and smoke tests.
5. Update the standalone deployment's `DATABASE_URL` and external webhook URLs.
6. Keep the old production app and its database recoverable until acceptance is confirmed.

Do not point the standalone application at the production database as a shortcut. Do not run destructive restore commands against a database that contains data you need to preserve.
