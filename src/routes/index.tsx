import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="text-[#94a3b8]">Carregando...</div>;
  }
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}
