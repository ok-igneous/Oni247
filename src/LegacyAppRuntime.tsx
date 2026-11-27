"use client";

import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ScrollToHashElement } from "../components/ScrollToHashElement";
import { PageViewTracker } from "../components/PageViewTracker";
import { App } from "./App";

/** React Router is isolated to this compatibility boundary; Next owns shared providers. */
export default function LegacyAppRuntime() {
  return (
    <div id="root">
      <React.StrictMode>
        <BrowserRouter>
          <ScrollToHashElement />
          <PageViewTracker />
          <App />
        </BrowserRouter>
      </React.StrictMode>
    </div>
  );
}
