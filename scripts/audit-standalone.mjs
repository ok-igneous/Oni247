import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".html", ".xml", ".yml", ".yaml", ".css"]);
const checks = [
  { label: "Floot package/runtime import", pattern: /@floot\//g, severity: "error" },
  { label: "Floot database environment variable", pattern: /FLOOT_DATABASE_URL/g, severity: "error" },
  { label: "Floot-generated session cookie", pattern: /floot_built_app_session/g, severity: "error" },
  { label: "Legacy Floot CDN path", pattern: /\/_cdn\//g, severity: "warning" },
  { label: "Floot native app URL scheme", pattern: /app\.floot\./g, severity: "warning" },
  { label: "Floot hosted domain", pattern: /floot\.app/g, severity: "warning" },
];

const findings = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    const text = await readFile(fullPath, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const check of checks) {
        check.pattern.lastIndex = 0;
        if (check.pattern.test(line)) {
          findings.push({ severity: check.severity, label: check.label, file: path.relative(root, fullPath), line: index + 1 });
        }
      }
    });
  }
}

await walk(root);
for (const item of findings) {
  process.stdout.write(`[${item.severity.toUpperCase()}] ${item.file}:${item.line} — ${item.label}\n`);
}
const errors = findings.filter((item) => item.severity === "error");
process.stdout.write(`\nStandalone audit: ${errors.length} blocking reference(s), ${findings.length - errors.length} migration warning(s).\n`);
if (errors.length) process.exitCode = 1;
