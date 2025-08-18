import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

import { JazzReactProvider } from "jazz-tools/react";
import { JazzInspector } from "jazz-tools/inspector";
import { JazzAccount, peerUrl } from "./jazz";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JazzReactProvider sync={{ peer: peerUrl() }} AccountSchema={JazzAccount}>
      <App />

      <JazzInspector position="bottom left" />
    </JazzReactProvider>
  </StrictMode>
);
