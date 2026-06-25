import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useDb, type Usuario } from "./db";

const SESSION_KEY = "cateqpro:session:v1";

interface AuthContextValue {
  user: Usuario | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { db } = useDb();
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (userId) window.localStorage.setItem(SESSION_KEY, userId);
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [userId]);

  const user = useMemo(() => db.usuarios.find((u) => u.id === userId) ?? null, [db.usuarios, userId]);

  const login: AuthContextValue["login"] = useCallback(
    (email, password) => {
      const u = db.usuarios.find(
        (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password,
      );
      if (!u) return { ok: false, error: "Email ou senha inválidos." };
      setUserId(u.id);
      return { ok: true };
    },
    [db.usuarios],
  );

  const logout = useCallback(() => setUserId(null), []);

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
