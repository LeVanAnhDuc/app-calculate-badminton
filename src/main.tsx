// libs
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// others
import "@/index.css";
import App from "@/App";
import { captureCallback } from "@/libs/duckerAuth";

// before the router exists: it reads the URL once, so ?code= must already be
// gone and the URL already back on the page the user signed in from
captureCallback();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
