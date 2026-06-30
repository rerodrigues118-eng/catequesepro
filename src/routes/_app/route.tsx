import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="text-[#94a3b8]">Carregando...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
