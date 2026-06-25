import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, Plus, UserCog, LogOut, Cross } from "lucide-react";
import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: typeof Users;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Início", icon: LayoutDashboard },
  { to: "/catequizandos", label: "Catequizandos", shortLabel: "Cadastros", icon: Users },
  { to: "/catequizandos/novo", label: "Novo cadastro", shortLabel: "Novo", icon: Plus },
  { to: "/usuarios", label: "Usuários", shortLabel: "Usuários", icon: UserCog, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((i) => !i.adminOnly || user?.role === "admin");

  const isActive = (to: string) => {
    if (to === "/dashboard") return pathname === "/dashboard";
    if (to === "/catequizandos/novo") return pathname === "/catequizandos/novo";
    if (to === "/catequizandos") return pathname === "/catequizandos" || (pathname.startsWith("/catequizandos") && pathname !== "/catequizandos/novo");
    return pathname.startsWith(to);
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Sidebar (desktop) */}
      <aside
        className="app-sidebar hidden md:flex flex-col fixed inset-y-0 left-0 z-30"
        style={{ width: 220, backgroundColor: "var(--color-sidebar)" }}
      >
        <div className="px-5 py-5 flex items-center gap-2 text-white" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Cross size={18} style={{ color: "#d97706" }} />
          <span className="text-[15px] font-semibold">CatequesePRO</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 text-sm rounded-[8px] transition-colors duration-100"
                style={{
                  padding: active ? "10px 16px 10px 13px" : "10px 16px",
                  backgroundColor: active ? "var(--color-primary-soft)" : "transparent",
                  color: active ? "#ffffff" : "var(--color-sidebar-muted)",
                  borderLeft: active ? "3px solid var(--color-accent)" : "3px solid transparent",
                  fontWeight: active ? 500 : 400,
                }}
                onMouseOver={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "var(--color-sidebar-hover)";
                    e.currentTarget.style.color = "#e2e8f0";
                  }
                }}
                onMouseOut={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--color-sidebar-muted)";
                  }
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-xs text-[#94a3b8] mb-2 truncate">
            {user?.nome}
            <div className="text-[10px] uppercase tracking-wider mt-0.5">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-[#94a3b8] hover:text-white transition-colors duration-100"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="app-main flex-1 md:ml-[220px] pb-20 md:pb-0">
        <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav
        className="app-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-30 flex"
        style={{ backgroundColor: "var(--color-sidebar)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {items.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex-1 flex flex-col items-center justify-center py-2 text-[10px]"
              style={{
                color: active ? "#ffffff" : "var(--color-sidebar-muted)",
                borderTop: active ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              <Icon size={18} />
              <span className="mt-1">{item.shortLabel}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-2 text-[10px]"
          style={{ color: "var(--color-sidebar-muted)" }}
        >
          <LogOut size={18} />
          <span className="mt-1">Sair</span>
        </button>
      </nav>
    </div>
  );
}
