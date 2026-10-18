import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SabeqSite from "../app/sabeq-site";
import siteStyles from "../app/globals.css?inline";
import interfaceStyles from "../app/interface-taste.css?inline";

const style = document.createElement("style");
style.dataset.sabeqStyles = "true";
style.textContent = `${siteStyles}\n${interfaceStyles}`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SabeqSite />
  </StrictMode>,
);
