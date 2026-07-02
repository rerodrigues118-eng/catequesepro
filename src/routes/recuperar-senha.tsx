import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui-lite";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — CatequesePRO" },
      { name: "description", content: "Recupere sua senha CatequesePRO." },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "Email enviado! Verifique sua caixa de entrada e spam.",
        });
        setSubmitted(true);
        setEmail("");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: (err as Error).message || "Erro ao enviar email de recuperação.",
      });
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
        <button
          onClick={() => navigate({ to: "/login" })}
          className="flex items-center gap-2 text-[#1e40af] hover:text-[#1e3a8a] mb-4 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <p className="text-center text-base font-medium text-[#0f172a]">Recuperar senha</p>
        <p className="text-center text-xs text-[#64748b] mt-2">
          Informe seu email e enviaremos um link para redefinir sua senha.
        </p>

        {submitted && message?.type === "success" ? (
          <div className="mt-6 space-y-4">
            <div
              className="text-sm px-4 py-3 rounded-[8px] text-center"
              style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}
            >
              {message.text}
            </div>
            <p className="text-xs text-[#64748b] text-center">
              Não recebeu o email? Verifique sua pasta de spam ou tente novamente com outro email.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                setMessage(null);
              }}
              variant="secondary"
              fullWidth
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </Field>

            {message && (
              <div
                className="text-xs px-3 py-2 rounded-[8px]"
                style={{
                  backgroundColor: message.type === "error" ? "#fee2e2" : "#f0fdf4",
                  color: message.type === "error" ? "#dc2626" : "#15803d",
                }}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
