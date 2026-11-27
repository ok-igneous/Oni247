#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", ".next", "dist", "coverage"]);
const roots = ["pages", "components", "helpers", "endpoints", "src", "server", "app"];
const findings = [];
const routeFiles = [];

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;

    const relative = path.relative(root, absolute).split(path.sep).join("/");
    const source = await readFile(absolute, "utf8");

    if (
      relative.startsWith("pages/") &&
      !relative.endsWith(".pageLayout.tsx") &&
      relative !== "pages/StorefrontPage.tsx" &&
      !relative.startsWith("pages/store.$slug")
    ) {
      const base = path.basename(relative).replace(/\.(tsx|jsx)$/, "");
      const route = base === "_index"
        ? "/"
        : "/" + base.replace(/\./g, "/").replace(/\$([A-Za-z0-9_]+)/g, "[$1]").replace(/^_/, "");
      routeFiles.push({ file: relative, route });
    }

    for (const [label, pattern] of [
      ["Vite import.meta.glob usage", /import\.meta\.glob/g],
      ["Vite import.meta.env usage", /import\.meta\.env/g],
    ]) {
      const count = [...source.matchAll(pattern)].length;
      if (count) findings.push({ file: relative, issue: label, count });
    }
  }
}

for (const folder of roots) await walk(path.join(root, folder));

routeFiles.sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));
const grouped = new Map();
for (const entry of routeFiles) {
  grouped.set(entry.route, [...(grouped.get(entry.route) ?? []), entry.file]);
}
const collisions = [...grouped.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([route, files]) => ({ route, files }));

for (const file of ["server", "endpoints", "src"]) {
  // Route and host resolution must not reintroduce the retired business-subdomain resolver.
  const directory = path.join(root, file);
  await walk(directory);
}
const forbiddenSubdomainResolver = routeFiles.some(({ file }) => file.includes("resolvePlatformSubdomainSlug"));
if (forbiddenSubdomainResolver) findings.push({ file: "source", issue: "Retired business-subdomain resolver remains", count: 1 });

const subscriptionSource = await readFile(path.join(root, "helpers", "subscriptionPlan.tsx"), "utf8");
const hostEndpointSource = await readFile(path.join(root, "endpoints", "storefrontHost_GET.ts"), "utf8");
const sitemapSource = await readFile(path.join(root, "endpoints", "sitemap_GET.ts"), "utf8");
if (!subscriptionSource.includes("canUseCustomDomain: paid")) {
  findings.push({ file: "helpers/subscriptionPlan.tsx", issue: "Custom-domain entitlement must be paid-only", count: 1 });
}
if (!hostEndpointSource.includes("subscriptionPlan.resolve(business).canUseCustomDomain")) {
  findings.push({ file: "endpoints/storefrontHost_GET.ts", issue: "Custom-domain host resolution must enforce paid entitlement", count: 1 });
}
if (!sitemapSource.includes("plan.canUseCustomDomain")) {
  findings.push({ file: "endpoints/sitemap_GET.ts", issue: "Sitemap must enforce paid custom-domain entitlement", count: 1 });
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const directViteDependencies = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
}).filter((name) => name === "vite" || name.startsWith("@vitejs/"));

const requiredFiles = [
  "src/app/store/[[...path]]/page.next.tsx",
  "src/app/legacy/[[...path]]/page.next.tsx",
  "src/app/%5Fapi/[...path]/route.next.ts",
  "server/nextApiProxy.ts",
  "scripts/generate-legacy-page-registry.mjs",
];
const missingRequiredFiles = [];
for (const file of requiredFiles) {
  try {
    await stat(path.join(root, file));
  } catch (error) {
    if (error.code === "ENOENT") missingRequiredFiles.push(file);
    else throw error;
  }
}

const obsoleteEntrypoints = [];
for (const file of ["vite.config.ts", "index.html", "src/main.tsx"]) {
  try {
    await stat(path.join(root, file));
    obsoleteEntrypoints.push(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const report = {
  routeCount: routeFiles.length,
  routes: routeFiles,
  routeCollisions: collisions,
  directViteDependencies,
  obsoleteEntrypoints,
  missingRequiredFiles,
  sourceFindings: findings,
  testRunner: packageJson.devDependencies?.vitest ? "Vitest (Vite is transitive, development-only)" : "No Vitest",
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (collisions.length || directViteDependencies.length || obsoleteEntrypoints.length || missingRequiredFiles.length || findings.length) {
  process.exitCode = 1;
}
