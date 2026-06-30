import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cross, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui-lite";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Criar conta — CatequesePRO" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; nome: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);



  useEffect(() => {
    if (typeof window === "undefined") return;
    // Support both query string (?token=) and hash (#token=)
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
    const tokenParam = params.get("token") || hashParams.get("token");
    if (!tokenParam) {
      setError("Link de convite inválido. Solicite um novo convite ao administrador.");
      setLoading(false);
      return;
    }
    setToken(tokenParam);
    void validateToken(tokenParam);
  }, []);

  const validateToken = async (tokenValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/-validate-convite?token=${encodeURIComponent(tokenValue)}`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "Convite inválido ou expirado. Solicite um novo convite ao administrador.");
        return;
      }
      setInvite(payload.invite);
    } catch (err) {
      setError((err as Error).message ?? "Erro ao validar o convite. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !invite) return;
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // 1. Accept the invite (creates auth user + profile)
      const response = await fetch("/api/-accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "Falha ao concluir o registro. Tente novamente.");
        return;
      }

      // 2. Auto-login: sign in with the newly created credentials
      setSuccess(true);
      try {
        const loginResult = await login(invite.email, password);
        if (loginResult.ok) {
          // Small delay so the user sees the success message briefly
          await new Promise((r) => setTimeout(r, 1200));
          navigate({ to: "/dashboard" });
          return;
        }
      } catch {
        // If auto-login fails, fall through — user can click the login button
      }
    } catch (err) {
      setError((err as Error).message ?? "Falha ao concluir o registro. Tente novamente.");
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  // If already logged in, redirect to dashboard (placed after all hooks)
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f8fafc" }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2" style={{ color: "#1e40af" }}>
            <Cross size={24} />
            <span className="text-xl font-semibold">CatequesePRO</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0f172a] mt-2">Criar sua conta</h1>
          <p className="text-sm text-[#64748b] mt-1">Complete seu cadastro para acessar o sistema</p>
        </div>

        <div className="bg-white p-7" style={{ borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {loading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "#1e40af", borderTopColor: "transparent" }}
              />
              <p className="text-sm text-[#64748b]">Validando seu convite...</p>
            </div>
          ) : error && !invite ? (
            <div className="space-y-4">
              <div className="text-sm text-[#dc2626] bg-[#fee2e2] rounded-[10px] px-4 py-4">
                <p className="font-medium mb-1">Convite inválido</p>
                <p>{error}</p>
              </div>
              <Button variant="secondary" fullWidth onClick={() => navigate({ to: "/login" })}>
                Voltar para o login
              </Button>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <CheckCircle2 size={48} style={{ color: "#16a34a" }} />
              <div>
                <p className="font-semibold text-[#0f172a]">Conta criada com sucesso!</p>
                <p className="text-sm text-[#64748b] mt-1">Entrando no sistema automaticamente...</p>
              </div>
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{ borderColor: "#1e40af", borderTopColor: "transparent" }}
              />
              <Button variant="secondary" onClick={() => navigate({ to: "/login" })}>
                Ir para o login
              </Button>
            </div>
          ) : invite ? (
            <form onSubmit={submit} className="space-y-4">
              {/* Pre-filled invite info */}
              <div
                className="rounded-[10px] p-4 space-y-1"
                style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd" }}
              >
                <p className="text-xs font-semibold text-[#0369a1] uppercase tracking-wide">Dados do convite</p>
                <p className="text-sm font-medium text-[#0f172a]">{invite.nome}</p>
                <p className="text-sm text-[#64748b]">{invite.email}</p>
              </div>

              <Field label="Criar senha" required>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b]"
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <span className="block mt-1 text-xs text-[#dc2626]">Mínimo 8 caracteres</span>
                )}
              </Field>

              <Field label="Confirmar senha" required>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b]"
                    aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <span className="block mt-1 text-xs text-[#dc2626]">As senhas não coincidem</span>
                )}
              </Field>

              {error && (
                <div className="text-sm text-[#dc2626] bg-[#fee2e2] rounded-[8px] px-3 py-2">{error}</div>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={submitting || password.length < 8 || password !== confirmPassword}
              >
                {submitting ? "Criando conta..." : "Criar conta e entrar"}
              </Button>

              <p className="text-center text-xs text-[#64748b]">
                Já tem conta?{" "}
                <a href="/login" className="text-[#1e40af] font-medium hover:underline">
                  Entrar
                </a>
              </p>
            </form>
          ) : (
            <p className="text-sm text-[#64748b] text-center py-4">Carregando...</p>
          )}
        </div>
      </div>
    </div>
  );
}
