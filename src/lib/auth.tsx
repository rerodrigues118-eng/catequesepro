import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface Profile {
  id: string;
  role: "admin" | "coordenacao" | "catequista";
  catequista_id?: string | null;
  permitir_ia?: boolean | null;
}

interface AuthContextValue {
  user: { id: string; email?: string | null; nome?: string | null } | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const defaultAuthContextValue: AuthContextValue = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  login: async () => ({ ok: false, error: "Auth provider not initialized" }),
  logout: async () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from<Profile>("profiles")
      .select("id, role, catequista_id, permitir_ia")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.warn(`Perfil não encontrado para usuário ${userId}. Um admin deve criá-lo manualmente.`);
      setProfile(null);
      return null;
    }

    setProfile(data);
    return data;
  }, []);

  const fetchSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    setSession(session);
    return session;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const session = await fetchSession();
      if (!isMounted) return;

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          nome: session.user.user_metadata?.nome ?? null,
        });
        await fetchProfile(session.user.id);
      }
      setIsLoading(false);
      setIsInitialized(true);
    };

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setSession(session ?? null);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          nome: session.user.user_metadata?.nome ?? null,
        });
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
      setIsInitialized(true);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session?.user) {
      return { ok: false, error: error?.message ?? "Email ou senha inválidos." };
    }

    const user = data.session.user;
    setSession(data.session);
    setUser({
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.nome ?? null,
    });

    let profileData = await fetchProfile(user.id);
    if (!profileData) {
      console.warn(`Perfil não encontrado para ${user.id}. Usuário não tem acesso ao sistema.`);
      return { ok: false, error: "Perfil de usuário não encontrado. Entre em contato com um administrador." };
    }

    return { ok: true };
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, session, profile, isLoading, isInitialized, login, logout }),
    [user, session, profile, isLoading, isInitialized, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
