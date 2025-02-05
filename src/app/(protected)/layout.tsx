import { requireAuth } from "@/lib/supabase-server";
import { AuthForm } from "@/components/landing/auth-form";
import { DashboardSidebar } from "@/components/sidebar-implementation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await requireAuth()

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
