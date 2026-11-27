import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const auditFile = path.resolve(root, "scripts/audit-standalone.mjs");
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const sourceExtensions = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".html", ".xml",
  ".plist", ".gradle", ".swift", ".kt", ".java", ".css", ".yml", ".yaml", ".sql", ".txt", ".example"
]);
const checks = [
  { label: "Legacy platform branding or runtime reference", pattern: /floot/i, severity: "error" },
  { label: "Legacy CDN asset path", pattern: /\/_cdn\//i, severity: "error" },
  { label: "Legacy native URL scheme", pattern: /app\.floot\./i, severity: "error" },
];

const findings = [];
const sourceFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (path.resolve(fullPath) === auditFile) continue;
    if (!sourceExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    sourceFiles.push(path.relative(root, fullPath).split(path.sep).join("/"));
    const contents = await readFile(fullPath, "utf8");
    const lines = contents.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const check of checks) {
        check.pattern.lastIndex = 0;
        if (check.pattern.test(line)) {
          findings.push({
            severity: check.severity,
            label: check.label,
            file: path.relative(root, fullPath),
            line: index + 1,
          });
        }
      }
    });
  }
}

await walk(root);
for (const item of findings) {
  process.stdout.write(`[${item.severity.toUpperCase()}] ${item.file}:${item.line} — ${item.label}\n`);
}

const pageFiles = sourceFiles.filter((file) =>
  file.startsWith("pages/") &&
  file.endsWith(".tsx") &&
  !file.endsWith(".pageLayout.tsx") &&
  !/^pages\\/store\\.\\$slug(?:\\.|$)/.test(file)
);
const toRoutePath = (file) => {
  const baseName = path.basename(file, ".tsx");
  if (baseName === "_index") return "/";
  return "/" + baseName
    .replace(/\./g, "/")
    .replace(/\$([A-Za-z0-9_]+)/g, ":$1")
    .replace(/^_/, "");
};
const routeGroups = new Map();
for (const file of pageFiles) {
  const route = toRoutePath(file);
  routeGroups.set(route, [...(routeGroups.get(route) ?? []), file]);
}
const duplicateRoutes = [...routeGroups.entries()].filter(([, files]) => files.length > 1);
for (const [route, files] of duplicateRoutes) {
  process.stdout.write(`[ERROR] Duplicate frontend route ${route}: ${files.join(", ")}\n`);
}

const endpointPattern = /_(GET|POST|PUT|PATCH|DELETE)\.ts$/;
const endpointKeys = new Map();
for (const file of sourceFiles.filter((item) => item.startsWith("endpoints/"))) {
  const relative = file.slice("endpoints/".length);
  const match = relative.match(endpointPattern);
  if (!match) continue;
  const key = `${match[1]} ${relative.replace(endpointPattern, "")}`;
  endpointKeys.set(key, [...(endpointKeys.get(key) ?? []), file]);
}
const duplicateEndpoints = [...endpointKeys.entries()].filter(([, files]) => files.length > 1);
for (const [key, files] of duplicateEndpoints) {
  process.stdout.write(`[ERROR] Duplicate API handler ${key}: ${files.join(", ")}\n`);
}

process.stdout.write(`Frontend routes: ${pageFiles.length}; API handlers: ${endpointKeys.size}.\n`);
const errors = findings.filter((item) => item.severity === "error").length + duplicateRoutes.length + duplicateEndpoints.length;
process.stdout.write(`\nStandalone audit: ${errors} blocking issue(s).\n`);
if (errors) process.exitCode = 1;
