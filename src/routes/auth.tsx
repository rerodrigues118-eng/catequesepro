import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Cross, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui-lite";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — CatequesePRO" },
      { name: "description", content: "Acesse sua conta CatequesePRO." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const r = login(email, password);
    if (!r.ok) setError(r.error);
    else navigate({ to: "/dashboard" });
  };

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

        <div className="mt-6 text-[11px] text-[#64748b] leading-relaxed">
          <p className="font-medium text-[#374151] mb-1">Contas demo</p>
          <p>admin@paroquia.test / admin</p>
          <p>catequista@paroquia.test / catequista</p>
        </div>
      </div>
    </div>
  );
}
