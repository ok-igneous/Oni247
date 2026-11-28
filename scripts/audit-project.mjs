import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const auditFile = path.resolve(root, "scripts/audit-project.mjs");
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

const appRouteFiles = sourceFiles.filter((file) =>
  file.startsWith("src/app/") &&
  /(?:^|\\/)(?:page|route)\\.(?:ts|tsx)$/.test(file)
);
const appLayoutFiles = sourceFiles.filter((file) =>
  file.startsWith("src/app/") &&
  /(?:^|\\/)layout\\.(?:ts|tsx)$/.test(file)
);

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

process.stdout.write(`Next.js App Router route/handler files: ${appRouteFiles.length}; layouts: ${appLayoutFiles.length}; API handlers: ${endpointKeys.size}.\n`);
const errors = findings.filter((item) => item.severity === "error").length + duplicateEndpoints.length;
process.stdout.write(`\nProject audit: ${errors} blocking issue(s).\n`);
if (errors) process.exitCode = 1;
