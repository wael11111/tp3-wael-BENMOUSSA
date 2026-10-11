import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { ToastProvider } from "@/components/Toast";
import "@/styles/index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Élément racine #root introuvable");
}

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
