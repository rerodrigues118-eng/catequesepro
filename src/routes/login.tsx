import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cross, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui-lite";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — CatequesePRO" },
      { name: "description", content: "Acesse sua conta CatequesePRO." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      // Redirect automatically to /register instead of requiring manual click
      navigate({ to: `/register?token=${encodeURIComponent(token)}` });
    }
  }, [navigate]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await login(email, password);
    if (!result.ok) setError(result.error);
    else navigate({ to: "/dashboard" });
  };

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f8fafc" }}>
      <div
        className="w-full max-w-[380px] bg-white p-7"
        style={{ borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-1" style={{ color: "#1e40af" }}>
          <Cross size={22} />
          <span className="text-[18px] font-semibold">CatequesePRO</span>
        </div>
        <p className="text-center text-base font-medium text-[#0f172a] mt-3">Acesse sua conta</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="seu@email.com"
              required
            />
          </Field>
          <Field label="Senha" required>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b]"
                aria-label={show ? "Esconder senha" : "Mostrar senha"}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate({ to: "/recuperar-senha" })}
              className="text-xs text-[#1e40af] hover:text-[#1e3a8a] font-medium"
            >
              Esqueci a senha
            </button>
          </div>

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-[8px]"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              {error}
            </div>
          )}

          <Button type="submit" fullWidth>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
