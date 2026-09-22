import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function AppShell() {
  return <main aria-label="HydroWise application shell" />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
