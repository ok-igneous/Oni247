import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true }),
  ));
});

describe("Next.js legacy route registry", () => {
  it("registers root vanity routes and excludes the removed /store/{slug} routes", async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "oni247-legacy-registry-"));
    temporaryDirectories.push(fixture);

    const pages = path.join(fixture, "pages");
    await mkdir(pages, { recursive: true });
    await Promise.all([
      writeFile(path.join(pages, "_index.tsx"), "export default function Home() {}"),
      writeFile(path.join(pages, "$slug.tsx"), "export default function Vanity() {}"),
      writeFile(path.join(pages, "StorefrontPage.tsx"), "export default function SharedComponent() {}"),
      writeFile(path.join(pages, "$slug.p.$productSlug.tsx"), "export default function Product() {}"),
      writeFile(path.join(pages, "store.$slug.tsx"), "export default function SharedStore() {}"),
      writeFile(path.join(pages, "store.$slug.p.$productSlug.tsx"), "export default function OldStoreProduct() {}"),
      writeFile(path.join(pages, "store.$slug.pageLayout.tsx"), "export default []"),
      writeFile(path.join(pages, "dashboard.tsx"), "export default function Dashboard() {}"),
    ]);

    const generator = path.resolve(process.cwd(), "scripts/generate-legacy-page-registry.mjs");
    await execFileAsync(process.execPath, [generator], { cwd: fixture });

    const registry = await readFile(path.join(fixture, "src/generated/legacyPageRegistry.ts"), "utf8");
    expect(registry).toContain("../pages/$slug.tsx");
    expect(registry).toContain("../pages/$slug.p.$productSlug.tsx");
    expect(registry).not.toContain("../pages/StorefrontPage.tsx");
    expect(registry).toContain("../pages/dashboard.tsx");
    expect(registry).not.toContain("../pages/store.$slug.tsx");
    expect(registry).not.toContain("../pages/store.$slug.p.$productSlug.tsx");
    expect(registry).not.toContain("../pages/store.$slug.pageLayout.tsx");
  });
});
