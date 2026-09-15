import { createRoot } from "react-dom/client";
import LegalOfficeApp from "./app/legal-office-app";
import "./app/globals.css";

// Open every section immediately. No login screen or credentials are needed.
createRoot(document.getElementById("root")!).render(
  <LegalOfficeApp guestMode viewer={{ email: "guest@example.invalid", displayName: "ضيف" }} signInPath="./" signOutPath="./" />,
);
