import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button, Field, Select, Textarea } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/ideias-ia")({
  head: () => ({ meta: [{ title: "Ideias IA — CatequesePRO" }] }),
  component: IdeiasIAPage,
});

const CATEGORIAS = [
  { value: "dinamica", label: "Dinâmica de grupo" },
  { value: "reflexao", label: "Reflexão bíblica" },
  { value: "oracao", label: "Oração criativa" },
  { value: "jogo", label: "Jogo catequético" },
  { value: "arte", label: "Atividade artística" },
  { value: "musica", label: "Música e louvor" },
  { value: "projeto", label: "Projeto de missão" },
  { value: "retiro", label: "Roteiro de retiro" },
];

const NIVEIS = [
  { value: "iniciacao", label: "Iniciação" },
  { value: "primeira_eucaristia", label: "1ª Eucaristia" },
  { value: "crisma", label: "Crisma" },
];

const FAIXAS = [
  { value: "criancas", label: "Crianças (7-9 anos)" },
  { value: "pre_adolescentes", label: "Pré-adolescentes (10-12)" },
  { value: "adolescentes", label: "Adolescentes (13-16)" },
  { value: "jovens", label: "Jovens (17+)" },
];

interface IdeiaGerada {
  titulo: string;
  objetivo: string;
  materiais: string[];
  passo_a_passo: string[];
  dica: string;
  versículo?: string;
}

function IdeiasIAPage() {
  const { profile } = useAuth();
  const [categoria, setCategoria] = useState("dinamica");
  const [nivel, setNivel] = useState("iniciacao");
  const [faixa, setFaixa] = useState("criancas");
  const [tema, setTema] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideia, setIdeia] = useState<IdeiaGerada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historico, setHistorico] = useState<IdeiaGerada[]>([]);

  const isAllowed = profile?.role === "admin" || profile?.role === "coordenacao" || !!profile?.permitir_ia;

  async function gerarIdeia() {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    setIdeia(null);

    const catLabel = CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;
    const nivelLabel = NIVEIS.find((n) => n.value === nivel)?.label ?? nivel;
    const faixaLabel = FAIXAS.find((f) => f.value === faixa)?.label ?? faixa;

    const prompt = `Você é um especialista em catequese católica. Crie uma ${catLabel} para catequizandos de ${nivelLabel} na faixa etária ${faixaLabel}${tema ? ` com o tema: "${tema}"` : ""}. 

Responda EXCLUSIVAMENTE em JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "titulo": "Nome criativo da atividade",
  "objetivo": "Objetivo catequético em 1-2 frases",
  "materiais": ["item 1", "item 2"],
  "passo_a_passo": ["Passo 1: ...", "Passo 2: ...", "Passo 3: ..."],
  "dica": "Dica prática do catequista em 1-2 frases",
  "versículo": "Referência bíblica relacionada (opcional)"
}`;

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_GROK_API_KEY ?? ""}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.8,
            max_tokens: 1024,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Erro na API do Groq");
      }

      const data = await response.json();
      const text: string = data.choices?.[0]?.message?.content ?? "";

      const jsonText = text.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
      const parsed: IdeiaGerada = JSON.parse(jsonText);

      setIdeia(parsed);
      setHistorico((prev) => [parsed, ...prev.slice(0, 4)]);
    } catch (e) {
      setError("Não foi possível gerar a ideia. Verifique os parâmetros de geração e tente novamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function copiarIdeia() {
    if (!ideia) return;
    const textToCopy = `
🌟 ${ideia.titulo}
📌 Objetivo: ${ideia.objetivo}

📦 Materiais:
${ideia.materiais.map((m) => `• ${m}`).join("\n")}

📋 Passo a passo:
${ideia.passo_a_passo.map((p, i) => `${i + 1}. ${p}`).join("\n")}

💡 Dica: ${ideia.dica}
${ideia.versículo ? `\n📖 Versículo: ${ideia.versículo}` : ""}
    `.trim();
    void navigator.clipboard.writeText(textToCopy);
  }

  if (!isAllowed) {
    return (
      <div>
        <PageHeader
          title="Ideias IA"
          subtitle="Gere atividades e dinâmicas com Inteligência Artificial"
        />
        <Card className="text-center py-12 border-amber-200" style={{ backgroundColor: "#fffbeb" }}>
          <div className="flex flex-col items-center gap-3">
            <i className="ti ti-lock text-amber-600" style={{ fontSize: 40 }} />
            <h2 className="text-base font-semibold text-[#92400e]">Acesso restrito</h2>
            <p className="text-sm text-[#b45309] max-w-md mx-auto leading-relaxed">
              Esta ferramenta de Inteligência Artificial está disponível apenas para catequistas autorizados pela coordenação. Entre em contato com seu coordenador para solicitar acesso.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ideias IA"
        subtitle="Gere atividades e dinâmicas com Inteligência Artificial"
      />

      {/* Config panel */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
          <i className="ti ti-bulb" style={{ color: "#d97706" }} />
          Gerar nova ideia
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoria">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Nível catequético">
            <Select value={nivel} onChange={(e) => setNivel(e.target.value)}>
              {NIVEIS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </Select>
          </Field>
          <Field label="Faixa etária">
            <Select value={faixa} onChange={(e) => setFaixa(e.target.value)}>
              {FAIXAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </Field>
          <Field label="Tema específico (opcional)">
            <input
              type="text"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Perdão, Eucaristia, Amor ao próximo..."
              className="w-full text-sm rounded-[8px] border border-[#e2e8f0] px-3 py-2 outline-none focus:border-[#1e40af] bg-white text-[#0f172a]"
            />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <Button
            onClick={gerarIdeia}
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)" }}
          >
            {loading ? (
              <><i className="ti ti-loader animate-spin" /> Gerando...</>
            ) : (
              <><i className="ti ti-sparkles" /> Gerar ideia</>
            )}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="mb-4 p-3 rounded-[8px] text-sm" style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="text-center py-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)" }}>
              <i className="ti ti-bulb text-white" style={{ fontSize: 22 }} />
            </div>
            <p className="text-sm text-[#64748b]">A IA está criando uma ideia incrível para você...</p>
            <div className="flex gap-1">
              {[0, 0.2, 0.4].map((delay) => (
                <div key={delay} className="w-2 h-2 rounded-full bg-[#1e40af] animate-bounce" style={{ animationDelay: `${delay}s` }} />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Result card */}
      {ideia && !loading && (
        <Card className="mb-5" style={{ border: "1px solid #c7d2fe" }}>
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">{ideia.titulo}</h2>
              {ideia.versículo && (
                <p className="text-xs text-[#7c3aed] mt-1 flex items-center gap-1">
                  <i className="ti ti-book" />
                  {ideia.versículo}
                </p>
              )}
            </div>
            <button
              onClick={copiarIdeia}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px]"
              style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
            >
              <i className="ti ti-copy" /> Copiar
            </button>
          </div>

          <div className="p-3 rounded-[8px] mb-4" style={{ backgroundColor: "#eff6ff" }}>
            <p className="text-xs font-semibold text-[#1e40af] mb-1 uppercase tracking-wide">Objetivo</p>
            <p className="text-sm text-[#374151]">{ideia.objetivo}</p>
          </div>

          {ideia.materiais.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Materiais</p>
              <ul className="flex flex-wrap gap-2">
                {ideia.materiais.map((m, i) => (
                  <li key={i} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#f1f5f9", color: "#374151" }}>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Passo a passo</p>
            <ol className="space-y-2">
              {ideia.passo_a_passo.map((passo, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[#374151]">{passo}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="p-3 rounded-[8px] flex gap-2" style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a" }}>
            <i className="ti ti-bulb" style={{ color: "#d97706", fontSize: 16, flexShrink: 0, marginTop: 2 }} />
            <p className="text-sm text-[#92400e]">{ideia.dica}</p>
          </div>
        </Card>
      )}

      {/* Historico */}
      {historico.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-3">Geradas anteriormente</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {historico.slice(1).map((h, i) => (
              <button key={i} onClick={() => setIdeia(h)} className="text-left bg-white rounded-[10px] p-3 hover:bg-[#f8fafc]" style={{ border: "1px solid #e2e8f0" }}>
                <p className="text-sm font-semibold text-[#0f172a]">{h.titulo}</p>
                <p className="text-xs text-[#94a3b8] mt-0.5 line-clamp-2">{h.objetivo}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
