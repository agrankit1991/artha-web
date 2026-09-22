/** Browser entrypoint: mounts the application into the document. */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self-hosted rather than from Google Fonts: the typeface is part of the
// build, so it cannot fail to load and no reader's visit is reported to a
// third party.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";

import { App } from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root is missing from index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
