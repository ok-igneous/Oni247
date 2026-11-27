"use client";

import React from "react";
import { BrowserRouter } from "react-router-dom";
import { GlobalContextProviders } from "../components/_globalContextProviders";
import { App } from "./App";

export default function LegacyAppRuntime() {
  return (
    <div id="root">
      <React.StrictMode>
        <BrowserRouter>
          <GlobalContextProviders>
            <App />
          </GlobalContextProviders>
        </BrowserRouter>
      </React.StrictMode>
    </div>
  );
}
