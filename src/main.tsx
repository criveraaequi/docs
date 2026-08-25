import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

export default function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Aequi — Data Layer Initialized</h1>
      <p>Mock data functions are set up. No screens built yet.</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
