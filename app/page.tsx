import { chatGPTSignOutPath } from "./chatgpt-auth";
import LegalOfficeApp from "./legal-office-app";
import LoginPanel from "./login-panel";
import { getApplicationIdentity } from "../lib/local-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getApplicationIdentity();
  if (!viewer) return <LoginPanel />;

  return (
    <LegalOfficeApp
      viewer={{ email: viewer.email, displayName: viewer.displayName }}
      signInPath="/"
      signOutPath={viewer.authType === "local" ? "/api/auth/logout" : chatGPTSignOutPath("/")}
    />
  );
}
