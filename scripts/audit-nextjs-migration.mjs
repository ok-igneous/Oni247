#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pagesRoot = path.join(root, "legacy-pages");
const sourceRoots = ["legacy-pages", "components", "helpers", "endpoints", "src", "app", "server"];
const findings = [];
const routeFiles = [];

async function walk(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const source = await readFile(absolute, "utf8");
      if (relative.startsWith("legacy-pages/") && !relative.endsWith(".pageLayout.tsx")) {
        const base = path.basename(relative).replace(/\.(tsx|jsx)$/, "");
        const route = base === "_index"
          ? "/"
          : "/" + base.replace(/\./g, "/").replace(/\$([A-Za-z0-9_]+)/g, "[$1]").replace(/^_/, "");
        routeFiles.push({ file: relative, route });
      }
      const patterns = [
        ["Vite import.meta.glob", /import\.meta\.glob/g],
        ["Vite client environment", /import\.meta\.env/g],
        ["React Router import", /from\s+["']react-router-dom["']/g],
        ["React Helmet import", /from\s+["']react-helmet["']/g],
        ["browser global reference", /\b(window|document|localStorage|sessionStorage)\b/g],
      ];
      for (const [label, pattern] of patterns) {
        const matches = [...source.matchAll(pattern)];
        if (matches.length) findings.push({ file: relative, issue: label, count: matches.length });
      }
    }
  }
}

for (const folder of sourceRoots) await walk(path.join(root, folder));
routeFiles.sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));

const grouped = new Map();
for (const entry of routeFiles) {
  const group = grouped.get(entry.route) ?? [];
  group.push(entry.file);
  grouped.set(entry.route, group);
}
const collisions = [...grouped.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([route, files]) => ({ route, files }));

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const directViteDependencies = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
}).filter((name) => name === "vite" || name.startsWith("@vitejs/"));
const viteFindings = findings.filter((finding) => finding.issue.startsWith("Vite"));

const report = {
  generatedAt: new Date().toISOString(),
  pagesDirectory: path.relative(root, pagesRoot),
  routeCount: routeFiles.length,
  routes: routeFiles,
  routeCollisions: collisions,
  directViteDependencies,
  viteFindings,
  compatibilityFindings: findings,
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (collisions.length || directViteDependencies.length || viteFindings.length) process.exitCode = 1;
