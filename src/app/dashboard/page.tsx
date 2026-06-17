import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import TopNav from "@/components/TopNav";
import DashboardTable from "@/components/DashboardTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!user.allowedPages.includes("dashboard")) redirect("/");

  return (
    <div className="min-h-screen">
      <TopNav name={user.name} role={user.role} allowedPages={user.allowedPages} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <DashboardTable />
      </main>
    </div>
  );
}
