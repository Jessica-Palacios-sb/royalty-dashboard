import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import TopNav from "@/components/TopNav";
import AdminSubNav from "@/components/AdminSubNav";
import UsersManager from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <TopNav name={user.name} role={user.role} allowedPages={user.allowedPages} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">Administración</h1>
        <AdminSubNav />
        <UsersManager currentUserId={user.id} />
      </main>
    </div>
  );
}
