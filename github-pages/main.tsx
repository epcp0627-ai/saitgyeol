import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-serif-kr";
import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("사잇결을 표시할 영역을 찾지 못했습니다.");
}

createRoot(root).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>,
);
