import { AdminDashboard } from "@/app/admin-dashboard";
import { AdminLogin } from "@/app/admin-login";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAdminSession();

  if (!session) return <AdminLogin />;

  return <AdminDashboard initialStaff={session.staff} />;
}
