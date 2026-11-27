import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { StorefrontHostProvider, useStorefrontHost } from "../helpers/storefrontHost";

const pageModules = import.meta.glob<{ default: React.ComponentType }>("../pages/*.tsx");
const layoutModules = import.meta.glob<{ default: React.ComponentType<{ children: React.ReactNode }>[] }>("../pages/*.pageLayout.tsx");

const toRoutePath = (fileName: string) => {
  if (fileName === "_index") return "/";
  return "/" + fileName
    .replace(/\./g, "/")
    .replace(/\$([A-Za-z0-9_]+)/g, ":$1")
    .replace(/^_/, "");
};

const routeEntries = Object.entries(pageModules)
  .filter(([file]) => !file.endsWith(".pageLayout.tsx"))
  .map(([file, loadPage]) => {
    const baseName = file.split("/").pop()!.replace(/\.tsx$/, "");
    const layoutKey = "../pages/" + baseName + ".pageLayout.tsx";
    const loadLayout = layoutModules[layoutKey];
    const Component = React.lazy(async () => {
      const [page, layout] = await Promise.all([
        loadPage(),
        loadLayout ? loadLayout() : Promise.resolve({ default: [] }),
      ]);
      const Wrapped = () => {
        let content: React.ReactNode = React.createElement(page.default);
        for (const Layer of [...layout.default].reverse()) {
          content = React.createElement(Layer, { children: content });
        }
        return <>{content}</>;
      };
      return { default: Wrapped };
    });
    return { path: toRoutePath(baseName), Component, key: baseName };
  })
  .sort((a, b) => a.path.length - b.path.length);

const landingPage = routeEntries.find((entry) => entry.key === "_index")!.Component;
const vanityHomePage = routeEntries.find((entry) => entry.key === "$slug")!.Component;

function AppLoading() {
  return (
    <main className="app-loading" role="status" aria-label="Loading">
      <span className="app-loading__spinner" aria-hidden="true" />
      <span className="app-loading__label">Getting things ready</span>
    </main>
  );
}

function HostAwareRoot() {
  const host = useStorefrontHost();
  if (!host.resolved) return <AppLoading />;
  const Page = host.slug ? vanityHomePage : landingPage;
  return <Page />;
}

export function App() {
  const vanityRoutes = routeEntries.filter((entry) => entry.key.startsWith("$slug."));
  return (
    <StorefrontHostProvider>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<HostAwareRoot />} />
          {routeEntries.filter((entry) => entry.key !== "_index").map(({ path, Component, key }) => (
            <Route key={key} path={path} element={<Component />} />
          ))}
          {vanityRoutes.map(({ path, Component, key }) => (
            <Route key={"host-" + key} path={path.replace(/^\/:slug/, "") || "/"} element={<Component />} />
          ))}
          <Route path="*" element={<main style={{ padding: 24 }}><h1>Page not found</h1><a href="/">Return home</a></main>} />
        </Routes>
      </Suspense>
    </StorefrontHostProvider>
  );
}
