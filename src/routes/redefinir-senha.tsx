import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui-lite";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — CatequesePRO" },
      { name: "description", content: "Redefinir sua senha CatequesePRO." },
    ],
  }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionValid(true);
      } else {
        // Verificar se há um token na URL (recovery)
        const hash = window.location.hash;
        if (hash.includes("access_token")) {
          setSessionValid(true);
        }
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f8fafc" }}>
        <div
          className="w-full max-w-[380px] bg-white p-7 text-center"
          style={{ borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <p className="text-[#64748b]">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f8fafc" }}>
        <div
          className="w-full max-w-[380px] bg-white p-7"
          style={{ borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <p className="text-center text-base font-medium text-[#0f172a]">Link inválido ou expirado</p>
          <p className="text-center text-sm text-[#64748b] mt-3">
            O link de recuperação expirou ou é inválido. Solicite um novo link.
          </p>
          <Button
            onClick={() => navigate({ to: "/recuperar-senha" })}
            fullWidth
            className="mt-6"
          >
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 2000);
      }
    } catch (err) {
      setError((err as Error).message || "Erro ao redefinir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f8fafc" }}>
      <div
        className="w-full max-w-[380px] bg-white p-7"
        style={{ borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        <p className="text-center text-base font-medium text-[#0f172a]">Redefinir senha</p>
        <p className="text-center text-xs text-[#64748b] mt-2">
          Crie uma nova senha para sua conta.
        </p>

        {success ? (
          <div className="mt-6">
            <div
              className="text-sm px-4 py-3 rounded-[8px] text-center"
              style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}
            >
              ✓ Senha alterada com sucesso! Redirecionando...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Nova senha" required>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b]"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Confirmar senha" required>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b]"
                  aria-label={showConfirm ? "Esconder senha" : "Mostrar senha"}
                  disabled={isLoading}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <div
                className="text-xs px-3 py-2 rounded-[8px]"
                style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
              >
                {error}
              </div>
            )}

            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? "Atualizando..." : "Redefinir senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
