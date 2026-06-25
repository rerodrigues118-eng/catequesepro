import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
