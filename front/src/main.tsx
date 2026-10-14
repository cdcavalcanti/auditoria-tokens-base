import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MeterApp } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MeterApp />
  </StrictMode>,
);
