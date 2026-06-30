import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, Plus, UserCog, LogOut, Cross, CalendarCheck, Bell, Settings2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type IconType = "lucide" | "tabler";

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon?: typeof Users;
  tiIcon?: string; // Tabler icon class e.g. "ti-speakerphone"
  roles?: string[];
  badge?: boolean; // show red dot badge
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Início", icon: LayoutDashboard },
  { to: "/catequizandos", label: "Catequizandos", shortLabel: "Cadastros", icon: Users },
  { to: "/catequizandos/novo", label: "Novo cadastro", shortLabel: "Novo", icon: Plus },
  { to: "/presencas", label: "Presenças", shortLabel: "Presença", icon: CalendarCheck },

  // Catequista section
  { to: "/avisos", label: "Mural de avisos", shortLabel: "Avisos", tiIcon: "ti-speakerphone" },
  { to: "/plano-aulas", label: "Plano de aulas", shortLabel: "Plano", tiIcon: "ti-calendar-event", roles: ["admin", "coordenacao", "catequista"] },
  { to: "/atividades", label: "Atividades", shortLabel: "Atividades", tiIcon: "ti-clipboard-list", roles: ["admin", "coordenacao", "catequista"] },
  { to: "/ideias-ia", label: "Ideias IA", shortLabel: "IA", tiIcon: "ti-bulb" },

  // Coordenação section
  { to: "/calendario", label: "Calendário", shortLabel: "Calendário", tiIcon: "ti-calendar-month" },
  { to: "/matriculas", label: "Matrículas", shortLabel: "Matrículas", tiIcon: "ti-user-plus", roles: ["admin", "coordenacao"] },

  // Admin section
  { to: "/notificacoes", label: "Notificações", shortLabel: "Notif.", icon: Bell, roles: ["admin", "coordenacao"] },
  { to: "/configuracoes", label: "Configurações", shortLabel: "Config.", icon: Settings2, roles: ["admin"] },
  { to: "/usuarios", label: "Usuários", shortLabel: "Usuários", icon: UserCog, roles: ["admin", "coordenacao"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt: () => void } | null>(null);
  const [unreadComunicados, setUnreadComunicados] = useState(0);

  // Capture PWA install prompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as Event & { prompt: () => void });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Count unread comunicados for catequistas
  useEffect(() => {
    if (!profile || profile.role === "admin" || profile.role === "coordenacao") return;
    async function fetchUnread() {
      const { data } = await supabase
        .from("comunicados")
        .select("id, comunicados_leituras!left(usuario_id)")
        .eq("comunicados_leituras.usuario_id", profile!.id);
      if (data) {
        const unread = data.filter((c: { comunicados_leituras: { usuario_id: string }[] }) => !c.comunicados_leituras?.length).length;
        setUnreadComunicados(unread);
      }
    }
    void fetchUnread();
  }, [profile]);

  const items = NAV.filter((i) => !i.roles || i.roles.includes(profile?.role ?? ""));

  const isActive = (to: string) => {
    if (to === "/dashboard") return pathname === "/dashboard";
    if (to === "/catequizandos/novo") return pathname === "/catequizandos/novo";
    if (to === "/catequizandos") return pathname === "/catequizandos" || (pathname.startsWith("/catequizandos") && pathname !== "/catequizandos/novo");
    return pathname.startsWith(to);
  };

  const handleLogout = () => {
    void logout();
    navigate({ to: "/login" });
  };

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Sidebar (desktop) */}
      <aside
        className="app-sidebar hidden md:flex flex-col fixed inset-y-0 left-0 z-30"
        style={{ width: 210, backgroundColor: "var(--color-sidebar)" }}
      >
        <div className="px-5 py-5 flex items-center gap-2 text-white" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Cross size={18} style={{ color: "#d97706" }} />
          <span className="text-[15px] font-semibold">CatequesePRO</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            const showBadge = item.badge && item.to === "/comunicados" && profile?.role === "catequista" && unreadComunicados > 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 text-sm rounded-[8px] transition-colors duration-100"
                style={{
                  padding: active ? "9px 16px 9px 13px" : "9px 16px",
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
                {Icon ? (
                  <Icon size={16} />
                ) : (
                  <i className={`ti ${item.tiIcon}`} style={{ fontSize: 16, lineHeight: 1 }} />
                )}
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span
                    style={{
                      backgroundColor: "#dc2626",
                      color: "#fff",
                      borderRadius: "9999px",
                      fontSize: 10,
                      fontWeight: 600,
                      minWidth: 18,
                      height: 18,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 5px",
                    }}
                  >
                    {unreadComunicados}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-2 text-xs rounded-[8px] px-3 py-2 text-white font-medium"
              style={{ backgroundColor: "#1e40af" }}
            >
              <i className="ti ti-download" style={{ fontSize: 14 }} />
              Instalar app
            </button>
          )}
          <div className="text-xs text-[#94a3b8] truncate">
            {user?.nome}
            <div className="text-[10px] uppercase tracking-wider mt-0.5">{profile?.role}</div>
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
      <main className="app-main flex-1 md:ml-[210px] pb-20 md:pb-0">
        <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav
        className="app-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-30 flex overflow-x-auto"
        style={{
          backgroundColor: "var(--color-sidebar)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {items.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          const showBadge = item.badge && item.to === "/comunicados" && profile?.role === "catequista" && unreadComunicados > 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex-shrink-0 flex flex-col items-center justify-center py-2 text-[10px] relative"
              style={{
                minWidth: 52,
                paddingLeft: 4,
                paddingRight: 4,
                color: active ? "#ffffff" : "var(--color-sidebar-muted)",
                borderTop: active ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              {Icon ? (
                <Icon size={18} />
              ) : (
                <i className={`ti ${item.tiIcon}`} style={{ fontSize: 18, lineHeight: 1 }} />
              )}
              {showBadge && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 8,
                    backgroundColor: "#dc2626",
                    color: "#fff",
                    borderRadius: "9999px",
                    fontSize: 8,
                    fontWeight: 700,
                    minWidth: 14,
                    height: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                  }}
                >
                  {unreadComunicados}
                </span>
              )}
              <span className="mt-1 truncate max-w-[48px] text-center">{item.shortLabel}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex-shrink-0 flex flex-col items-center justify-center py-2 text-[10px]"
          style={{ minWidth: 52, paddingLeft: 4, paddingRight: 4, color: "var(--color-sidebar-muted)", borderTop: "2px solid transparent" }}
        >
          <LogOut size={18} />
          <span className="mt-1">Sair</span>
        </button>
      </nav>
    </div>
  );
}
