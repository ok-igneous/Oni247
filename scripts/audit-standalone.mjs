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
const sourceFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    sourceFiles.push(path.relative(root, fullPath).split(path.sep).join("/"));
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
const pageFiles = sourceFiles.filter((file) =>
  file.startsWith("pages/") && file.endsWith(".tsx") && !file.endsWith(".pageLayout.tsx")
);
const toRoutePath = (file) => {
  const baseName = path.basename(file, ".tsx");
  if (baseName === "_index") return "/";
  return "/" + baseName
    .replace(/\\./g, "/")
    .replace(/\\$([A-Za-z0-9_]+)/g, ":$1")
    .replace(/^_/, "");
};
const routeGroups = new Map();
for (const file of pageFiles) {
  const route = toRoutePath(file);
  routeGroups.set(route, [...(routeGroups.get(route) ?? []), file]);
}
const duplicateRoutes = [...routeGroups.entries()].filter(([, files]) => files.length > 1);
for (const [route, files] of duplicateRoutes) {
  process.stdout.write(`[ERROR] Duplicate frontend route ${route}: ${files.join(", ")}\\n`);
}

const endpointPattern = /_(GET|POST|PUT|PATCH|DELETE)\\.ts$/;
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
  process.stdout.write(`[ERROR] Duplicate API handler ${key}: ${files.join(", ")}\\n`);
}
process.stdout.write(`Frontend routes: ${pageFiles.length}; API handlers: ${endpointKeys.size}.\\n`);

const errors = findings.filter((item) => item.severity === "error").length + duplicateRoutes.length + duplicateEndpoints.length;
process.stdout.write(`\\nStandalone audit: ${errors} blocking issue(s), ${findings.length - findings.filter((item) => item.severity === "error").length} migration warning(s).\\n`);
if (errors) process.exitCode = 1;
