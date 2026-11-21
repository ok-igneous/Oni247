# Oni247 source migration

Status: **not yet transferred**.

The current Floot source inventory was inspected on 2026-11-21. The Floot project exposes 811 text/source files (approximately 2.11 million characters) at project version 1795237281286. The GitHub baseline on main contains 487 files total: 484 paths also present in Floot, plus three GitHub-specific files.

The Floot-to-GitHub bulk read was blocked by the account's daily Floot build-action limit. Floot counts file reads as build actions. No source files were transferred in this attempt, and no claim is made that this branch is a complete snapshot.

The branch `floot-source-snapshot-2026-11-21` was created from the existing main branch to preserve the baseline and provide a safe destination for the next transfer. Do not merge it as a completed source migration.

Next steps after the Floot action limit resets:
1. Read the 811 current Floot files in bounded batches without invoking any Floot write/build action.
2. Compare each retrieved file against the existing GitHub path and content, not just file sizes.
3. Commit the full Floot source snapshot to this branch while preserving GitHub-specific files.
4. Verify file counts, content hashes, required project configuration, and build/test viability.
5. Separately account for Floot-hosted uploads, secrets/environment variables, and database export; they are not included in this source-file inventory.
