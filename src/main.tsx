import React from "react";
import ReactDOM from "react-dom/client";
import { loadSettings } from "./L4-data/settings-repository";
import { Root } from "./root";
import "./index.css";

const initialSettings = loadSettings();
document.documentElement.dataset.theme = initialSettings.appearance.theme === "light" ? "light" : "dark";
document.documentElement.dataset.accent = initialSettings.appearance.accent;
delete document.documentElement.dataset.fontSize;
delete document.documentElement.dataset.density;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
