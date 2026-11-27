import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { StorefrontHostProvider, useStorefrontHost } from "../helpers/storefrontHost";

import { pageModules, layoutModules } from "./generated/legacyPageRegistry";

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
    const layoutKey = "../legacy-pages/" + baseName + ".pageLayout.tsx";
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
    <main className="app-loading" role="status" aria-label="Loading page">
      <div className="app-loading__skeleton" aria-hidden="true">
        <div className="app-loading__topbar">
          <span className="app-loading__brand-mark app-loading__shimmer" />
          <span className="app-loading__topbar-line app-loading__shimmer" />
          <span className="app-loading__topbar-action app-loading__shimmer" />
        </div>

        <div className="app-loading__content">
          <section className="app-loading__intro">
            <span className="app-loading__avatar app-loading__shimmer" />
            <div className="app-loading__intro-lines">
              <span className="app-loading__line app-loading__line--long app-loading__shimmer" />
              <span className="app-loading__line app-loading__line--short app-loading__shimmer" />
            </div>
          </section>

          <section className="app-loading__feature app-loading__shimmer">
            <span className="app-loading__feature-line" />
            <span className="app-loading__feature-line app-loading__feature-line--short" />
            <span className="app-loading__feature-block" />
          </section>

          <section className="app-loading__feed">
            <div className="app-loading__feed-heading">
              <span className="app-loading__small-avatar app-loading__shimmer" />
              <div className="app-loading__intro-lines">
                <span className="app-loading__line app-loading__line--medium app-loading__shimmer" />
                <span className="app-loading__line app-loading__line--tiny app-loading__shimmer" />
              </div>
            </div>
            <span className="app-loading__feed-image app-loading__shimmer" />
            <div className="app-loading__feed-footer">
              <span className="app-loading__line app-loading__line--short app-loading__shimmer" />
              <span className="app-loading__line app-loading__line--tiny app-loading__shimmer" />
            </div>
          </section>
        </div>
      </div>
      <span className="app-loading__sr-label">Loading</span>
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
