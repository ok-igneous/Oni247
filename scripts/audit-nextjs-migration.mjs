#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", ".next", "dist", "coverage"]);
const roots = ["src", "components", "helpers", "endpoints", "server", "scripts"];
const failures = [];
const sourceExtensions = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

async function exists(relative) {
  try { await access(path.join(root, relative)); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function walk(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const entry of entries) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) { await walk(absolute); continue; }
    if (!sourceExtensions.test(entry.name)) continue;
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (relative === "scripts/audit-nextjs-migration.mjs") continue;
    const source = await readFile(absolute, "utf8");
    const checks = [
      ["React Router import", /from\s*["']react-router(?:-dom)?["']/],
      ["React Helmet import", /from\s*["']react-helmet["']/],
      ["Legacy page import", /from\s*["'][^"']*legacy-pages\//],
      ["Legacy runtime reference", /\b(?:LegacyAppClient|LegacyAppRuntime|legacyRootPageSlugs|legacyPageRegistry)\b/],
      ["BrowserRouter runtime", /\bBrowserRouter\b/],
    ];
    for (const [label, pattern] of checks) {
      if (pattern.test(source)) failures.push({ file: relative, issue: label });
    }
  }
}

for (const folder of roots) await walk(path.join(root, folder));

const obsoletePaths = [
  "legacy-pages",
  "src/App.tsx",
  "src/LegacyAppClient.tsx",
  "src/LegacyAppRuntime.tsx",
  "src/app/legacy",
  // An underscore-prefixed folder is private in Next.js. The escaped directory
  // name is required to expose the literal /_api URL segment.
  "src/app/_api",
  "scripts/generate-legacy-page-registry.mjs",
  "scripts/generate-legacy-page-registry.spec.ts",
];
for (const relative of obsoletePaths) {
  if (await exists(relative)) failures.push({ file: relative, issue: "Obsolete legacy frontend source remains" });
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (!packageJson.dependencies?.next) {
  failures.push({ file: "package.json", issue: "Next.js must be a direct runtime dependency" });
}
for (const name of ["react-router-dom", "react-helmet", "@types/react-helmet", "vite", "@vitejs/plugin-react"]) {
  if (packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]) {
    failures.push({ file: "package.json", issue: "Obsolete or competing frontend dependency remains: " + name });
  }
}
for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  if (/\bvite\b/i.test(command)) {
    failures.push({ file: "package.json", issue: "Non-Next.js frontend command remains in script " + name });
  }
}
if (packageJson.scripts?.prestart) {
  failures.push({ file: "package.json", issue: "Application startup must not execute automatic prestart hooks" });
}

const nextConfig = await readFile(path.join(root, "next.config.ts"), "utf8");
if (/rewrites\s*\(/.test(nextConfig) || /destination:\s*["']\/legacy/.test(nextConfig)) {
  failures.push({ file: "next.config.ts", issue: "Legacy route rewrite remains" });
}

async function findNonstandardRoutes(directory) {
  const routes = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) routes.push(...await findNonstandardRoutes(absolute));
    else if (/^(?:page|layout|route)\.next\.(?:ts|tsx)$/.test(entry.name)) routes.push(path.relative(root, absolute));
  }
  return routes;
}
for (const file of await findNonstandardRoutes(path.join(root, "src", "app"))) {
  failures.push({ file, issue: "Non-standard Next.js route filename; use page.tsx/layout.tsx/route.ts" });
}

const requiredRoutes = [
  "src/app/page.tsx", "src/app/login/page.tsx", "src/app/register/page.tsx",
  "src/app/forgot-password/page.tsx", "src/app/reset-password/page.tsx",
  "src/app/verify-email/page.tsx", "src/app/dashboard/page.tsx", "src/app/admin/page.tsx",
  "src/app/[slug]/page.tsx", "src/app/[slug]/p/[productSlug]/page.tsx",
  "src/app/[slug]/s/[serviceId]/page.tsx", "src/app/[slug]/b/[blogSlug]/page.tsx",
  "src/app/[slug]/e/[eventSlug]/page.tsx", "src/app/[slug]/f/[formId]/page.tsx",
  "src/app/[slug]/g/[gallerySlug]/page.tsx", "src/app/[slug]/track/page.tsx",
  "src/app/[slug]/track/[code]/page.tsx", "src/app/[slug]/checkout/page.tsx",
  "src/app/[slug]/booking/[code]/page.tsx", "src/app/[slug]/book/[serviceId]/page.tsx",
  "src/app/%5Fapi/[...path]/route.ts",
  "src/app/track/page.tsx", "src/app/track/[code]/page.tsx", "src/app/pay/[code]/page.tsx",
  "src/app/booking/[code]/page.tsx", "src/app/checkout/page.tsx",
];
for (const relative of requiredRoutes) {
  if (!(await exists(relative))) failures.push({ file: relative, issue: "Required App Router route is missing" });
}

if (failures.length) {
  for (const item of failures) process.stderr.write("[FAIL] " + item.file + ": " + item.issue + "\n");
  process.stderr.write("Next.js architecture audit failed with " + failures.length + " issue(s).\n");
  process.exitCode = 1;
} else {
  process.stdout.write("Next.js architecture audit passed: no legacy router/runtime, no fallback rewrites, standard App Router filenames, and required routes are present.\n");
}
