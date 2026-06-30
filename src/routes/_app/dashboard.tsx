import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { calcIdade, nivelLabel, type Nivel } from "@/lib/db";
import { supabase } from "@/lib/supabase";

const NivelPieChart = lazy(() => import("@/components/DashboardCharts").then(m => ({ default: m.NivelPieChart })));
const ComunidadeBarChart = lazy(() => import("@/components/DashboardCharts").then(m => ({ default: m.ComunidadeBarChart })));
const HistoricoBarChart = lazy(() => import("@/components/DashboardCharts").then(m => ({ default: m.HistoricoBarChart })));

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CatequesePRO" }] }),
  component: Dashboard,
});

type Role = "admin" | "coordenacao" | "catequista";

type CatequistaRecord = {
  id: string;
  nome: string;
  comunidade_id: string;
  created_at?: string;
};

type CatequizandoRecord = {
  id: string;
  nome: string;
  data_nascimento: string;
  nivel: Nivel;
  catequista_id: string;
  comunidade_id: string;
  paroquia_id?: string;
};

type ComunidadeRecord = {
  id: string;
  nome: string;
};

type ParoquiaRecord = {
  id: string;
  nome: string;
};

type PresencaRecord = {
  id?: string;
  catequizando_id: string;
  data_presenca: string;
  status: "presente" | "falta" | "justificada";
};

type ConfiguracaoRecord = {
  id?: string;
  max_faltas?: number | null;
  idade_min_iniciacao?: number | null;
  idade_min_primeira_comunhao?: number | null;
  idade_min_crisma?: number | null;
};

function MetricCard({ cor, label, valor, sub }: { cor: string; label: string; valor: string | number; sub: string }) {
  return (
    <div
      style={{
        background: cor,
        borderRadius: 8,
        padding: "16px 18px",
        flex: "1 1 130px",
        minWidth: 0,
      }}
    >
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.7)" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.1, marginTop: 6 }}>{valor}</p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{sub}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{children}</p>;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{label}</div>
      {payload.map((item, index) => (
        <div key={`${item.name ?? "serie"}-${index}`} style={{ color: item.color ?? "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: item.color ?? "#1e40af", display: "inline-block" }} />
          <span>{item.name}</span>
          <span style={{ marginLeft: 6, fontWeight: 600 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const { profile, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<{
    loading: boolean;
    paroquias: ParoquiaRecord[];
    comunidades: ComunidadeRecord[];
    catequistas: CatequistaRecord[];
    catequizandos: CatequizandoRecord[];
    presencas: PresencaRecord[];
    config: ConfiguracaoRecord | null;
  }>({
    loading: true,
    paroquias: [],
    comunidades: [],
    catequistas: [],
    catequizandos: [],
    presencas: [],
    config: null,
  });
  const [comunidadeFilter, setComunidadeFilter] = useState("all");

  const { loading, paroquias, comunidades, catequistas, catequizandos, presencas, config } = state;

  const role = (profile?.role as Role | undefined) ?? "catequista";
  const isAdmin = role === "admin" || role === "coordenacao";

  useEffect(() => {
    const load = async () => {
      if (!profile) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      try {
        if (isAdmin) {
          const [paroquiasRes, comunidadesRes, catequistasRes, catequizandosRes, presencasRes, configRes] = await Promise.all([
            supabase.from<ParoquiaRecord>("paroquias").select("id,nome"),
            supabase.from<ComunidadeRecord>("comunidades").select("id,nome"),
            supabase.from<CatequistaRecord>("catequistas").select("id,nome,comunidade_id"),
            supabase.from<CatequizandoRecord>("catequizandos").select("id,nome,data_nascimento,nivel,catequista_id,comunidade_id,paroquia_id"),
            supabase.from<PresencaRecord>("presencas").select("catequizando_id,data_presenca,status"),
            supabase.from<ConfiguracaoRecord>("configuracoes_notificacao").select("max_faltas,idade_min_iniciacao,idade_min_primeira_comunhao,idade_min_crisma").limit(1).maybeSingle(),
          ]);

          setState({
            loading: false,
            paroquias: paroquiasRes.data ?? [],
            comunidades: comunidadesRes.data ?? [],
            catequistas: catequistasRes.data ?? [],
            catequizandos: catequizandosRes.data ?? [],
            presencas: presencasRes.data ?? [],
            config: configRes.data ?? null,
          });
        } else {
          // For catequistas: first fetch their students, then get presencas
          const [paroquiasRes, comunidadesRes, catequistasRes, catequizandosRes, configRes] = await Promise.all([
            supabase.from<ParoquiaRecord>("paroquias").select("id,nome"),
            supabase.from<ComunidadeRecord>("comunidades").select("id,nome"),
            supabase.from<CatequistaRecord>("catequistas").select("id,nome,comunidade_id").eq("id", profile.catequista_id ?? ""),
            supabase.from<CatequizandoRecord>("catequizandos").select("id,nome,data_nascimento,nivel,catequista_id,comunidade_id,paroquia_id").eq("catequista_id", profile.catequista_id ?? ""),
            supabase.from<ConfiguracaoRecord>("configuracoes_notificacao").select("max_faltas,idade_min_iniciacao,idade_min_primeira_comunhao,idade_min_crisma").limit(1).maybeSingle(),
          ]);

          const myStudents = catequizandosRes.data ?? [];
          const myStudentIds = myStudents.map((c) => c.id);

          // Only fetch presencas if there are students (avoids .in([]) bug)
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().slice(0, 10);

          let presencasData: PresencaRecord[] = [];
          if (myStudentIds.length > 0) {
            const presencasRes = await supabase
              .from<PresencaRecord>("presencas")
              .select("catequizando_id,data_presenca,status")
              .in("catequizando_id", myStudentIds)
              .gte("data_presenca", ninetyDaysAgoStr);
            presencasData = presencasRes.data ?? [];
          }

          setState({
            loading: false,
            paroquias: paroquiasRes.data ?? [],
            comunidades: comunidadesRes.data ?? [],
            catequistas: catequistasRes.data ?? [],
            catequizandos: myStudents,
            presencas: presencasData,
            config: configRes.data ?? null,
          });
        }
      } catch {
        setState({
          loading: false,
          paroquias: [],
          comunidades: [],
          catequistas: [],
          catequizandos: [],
          presencas: [],
          config: null,
        });
      }
    };

    void load();
  }, [isAdmin, profile]);

  const totalCatequizandos = catequizandos.length;
  const totalCatequistas = catequistas.length;
  const totalComunidades = comunidades.length;
  const mediaPorCatequista = totalCatequistas ? (totalCatequizandos / totalCatequistas).toFixed(1) : "0";

  const filteredCatequizandos = useMemo(() => {
    if (!isAdmin || comunidadeFilter === "all") return catequizandos;
    return catequizandos.filter((item) => item.comunidade_id === comunidadeFilter);
  }, [catequizandos, comunidadeFilter, isAdmin]);

  const filteredCatequistas = useMemo(() => {
    if (!isAdmin || comunidadeFilter === "all") return catequistas;
    return catequistas.filter((item) => item.comunidade_id === comunidadeFilter);
  }, [catequistas, comunidadeFilter, isAdmin]);

  const filteredComunidades = useMemo(() => {
    if (!isAdmin || comunidadeFilter === "all") return comunidades;
    return comunidades.filter((item) => item.id === comunidadeFilter);
  }, [comunidades, comunidadeFilter, isAdmin]);

  const nivelChartData = useMemo(() => {
    const counts: Record<Nivel, number> = { iniciacao: 0, primeira_eucaristia: 0, crisma: 0 };
    filteredCatequizandos.forEach((item) => {
      counts[item.nivel] += 1;
    });
    return [
      { name: "Iniciação", value: counts.iniciacao, fill: "#1e40af" },
      { name: "1ª Comunhão", value: counts.primeira_eucaristia, fill: "#d97706" },
      { name: "Crisma", value: counts.crisma, fill: "#7c3aed" },
    ];
  }, [filteredCatequizandos]);

  const comunidadeChartData = useMemo(() => {
    return filteredComunidades.map((com) => ({
      nome: com.nome,
      n: filteredCatequizandos.filter((item) => item.comunidade_id === com.id).length,
    }));
  }, [filteredCatequizandos, filteredComunidades]);

  const faltasMes = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const absenceMap = new Map<string, number>();
    filteredCatequizandos.forEach((item) => {
      const qty = presencas.filter((p) => p.catequizando_id === item.id && p.status === "falta" && p.data_presenca.startsWith(currentMonth)).length;
      if (qty > 0) absenceMap.set(item.id, qty);
    });
    return Array.from(absenceMap.entries()).map(([catequizandoId, qty]) => {
      const catequizando = filteredCatequizandos.find((item) => item.id === catequizandoId);
      const comunidade = comunidades.find((item) => item.id === catequizando?.comunidade_id);
      return { catequizandoId, nome: catequizando?.nome ?? "—", comunidade: comunidade?.nome ?? "—", qty };
    }).filter((item) => item.qty > (config?.max_faltas ?? 3));
  }, [filteredCatequizandos, presencas, comunidades, config]);

  const abaixoIdade = useMemo(() => {
    const mins = {
      iniciacao: config?.idade_min_iniciacao ?? 7,
      primeira_eucaristia: config?.idade_min_primeira_comunhao ?? 9,
      crisma: config?.idade_min_crisma ?? 14,
    } as Record<Nivel, number>;
    return filteredCatequizandos.filter((item) => {
      const idade = calcIdade(item.data_nascimento);
      return idade < mins[item.nivel];
    }).map((item) => ({
      id: item.id,
      nome: item.nome,
      nivel: item.nivel,
      idade: calcIdade(item.data_nascimento),
      idadeMinima: mins[item.nivel],
    }));
  }, [filteredCatequizandos, config]);

  const topCatequistas = useMemo(() => {
    return filteredCatequistas
      .map((cat) => ({
        id: cat.id,
        nome: cat.nome,
        total: filteredCatequizandos.filter((item) => item.catequista_id === cat.id).length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredCatequistas, filteredCatequizandos]);

  const topFaltas = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const faltasMap = new Map<string, number>();
    filteredCatequizandos.forEach((item) => {
      const qty = presencas.filter((p) => p.catequizando_id === item.id && p.status === "falta" && p.data_presenca.startsWith(currentMonth)).length;
      if (qty > 0) faltasMap.set(item.id, qty);
    });
    return Array.from(faltasMap.entries())
      .map(([catequizandoId, qty]) => {
        const catequizando = filteredCatequizandos.find((item) => item.id === catequizandoId);
        return { id: catequizandoId, nome: catequizando?.nome ?? "—", faltas: qty };
      })
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, 5);
  }, [filteredCatequizandos, presencas]);

  const presencaGeralMes = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const presencasMes = presencas.filter((p) => p.data_presenca.startsWith(currentMonth));
    const presentes = presencasMes.filter((p) => p.status === "presente").length;
    const faltas = presencasMes.filter((p) => p.status === "falta").length;
    const justificadas = presencasMes.filter((p) => p.status === "justificada").length;
    const total = presentes + faltas + justificadas;
    return {
      presentes,
      faltas,
      justificadas,
      pct: total > 0 ? Math.round((presentes / total) * 100) : 0,
    };
  }, [presencas]);

  // Catequista-specific calculations (must be before any conditional return)
  const catequista = catequistas[0];
  const comunidade = comunidades.find((item) => item.id === catequista?.comunidade_id);
  const turmaNiveis = Array.from(new Set(catequizandos.map((item) => item.nivel)));
  const nivelLabelResumo = turmaNiveis.length === 1 ? nivelLabel(turmaNiveis[0]) : "Vários níveis";
  const hoje = new Date().toISOString().slice(0, 10);
  const presencasHoje = presencas.filter((item) => item.data_presenca === hoje);
  const presentesHoje = presencasHoje.filter((item) => item.status === "presente").length;
  const faltasHoje = presencasHoje.filter((item) => item.status === "falta").length;
  const naoMarcadosHoje = Math.max(catequizandos.length - (presentesHoje + faltasHoje), 0);
  const pctPresenca = catequizandos.length ? Math.round((presentesHoje / Math.max(catequizandos.length, 1)) * 100) : 0;
  const historico = useMemo(() => {
    const porData = new Map<string, { presentes: number; faltas: number }>();
    presencas
      .slice()
      .sort((a, b) => b.data_presenca.localeCompare(a.data_presenca))
      .forEach((item) => {
        if (!porData.has(item.data_presenca)) {
          porData.set(item.data_presenca, { presentes: 0, faltas: 0 });
        }
        const entry = porData.get(item.data_presenca)!;
        if (item.status === "presente") entry.presentes += 1;
        if (item.status === "falta") entry.faltas += 1;
      });
    return Array.from(porData.entries())
      .slice(0, 4)
      .reverse()
      .map(([data, values]) => ({
        data: new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        presentes: values.presentes,
        faltas: values.faltas,
      }));
  }, [presencas]);
  const statusCards = catequizandos.map((item) => {
    const presenca = presencasHoje.find((entry) => entry.catequizando_id === item.id);
    const status = presenca?.status ?? "nao_marcado";
    return { ...item, status };
  });

  const paroquiaNome = "Paróquia São José das Familias";

  if (authLoading || loading) {
    return <div style={{ padding: 24, color: "#94a3b8" }}>Carregando...</div>;
  }

  if (!profile) {
    return <div style={{ padding: 24, color: "#94a3b8" }}>Carregando...</div>;
  }

  if (isAdmin) {
    return (
      <div style={{ padding: 16, background: "#f8fafc", minHeight: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Dashboard</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{paroquiaNome}</div>
          </div>
          <select
            value={comunidadeFilter}
            onChange={(event) => setComunidadeFilter(event.target.value)}
            style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#0f172a", background: "#fff" }}
          >
            <option value="all">Todas as comunidades</option>
            {comunidades.map((com) => (
              <option key={com.id} value={com.id}>{com.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <MetricCard cor="#1e40af" label="Catequizandos" valor={totalCatequizandos} sub="no total" />
          <MetricCard cor="#d97706" label="Catequistas" valor={totalCatequistas} sub="ativos" />
          <MetricCard cor="#15803d" label="Comunidades" valor={totalComunidades} sub="ativas" />
          <MetricCard cor="#7c3aed" label="Média / catequista" valor={mediaPorCatequista} sub="catequizandos" />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "1 1 230px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
            <SectionLabel>Distribuição por nível</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                <Suspense fallback={<div style={{ fontSize: 11, color: "#94a3b8" }}>Carregando...</div>}>
                  <NivelPieChart data={nivelChartData} />
                </Suspense>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                {nivelChartData.map((item) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: item.fill }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: "1 1 260px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
            <SectionLabel>Catequizandos por comunidade</SectionLabel>
            <div style={{ width: "100%", height: 140 }}>
              <Suspense fallback={<div style={{ fontSize: 11, color: "#94a3b8" }}>Carregando...</div>}>
                <ComunidadeBarChart data={comunidadeChartData} />
              </Suspense>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "1 1 220px", border: "1px solid #fca5a5", borderRadius: 8, padding: 16, background: "#fff" }}>
            <SectionLabel>⚠ Excesso de faltas</SectionLabel>
            {faltasMes.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 0", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>
                <span style={{ fontSize: 14, marginBottom: 4 }}>•</span>
                <span>Nenhuma ocorrência este mês</span>
              </div>
            ) : (
              <div>
                {faltasMes.slice(0, 3).map((item) => (
                  <div key={item.catequizandoId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{item.nome}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.comunidade}</div>
                    </div>
                    <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 5, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{item.qty} faltas</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: "1 1 220px", border: "1px solid #fde68a", borderRadius: 8, padding: 16, background: "#fff" }}>
            <SectionLabel>⚠ Abaixo da idade mínima</SectionLabel>
            {abaixoIdade.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 0", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>
                <span style={{ fontSize: 14, marginBottom: 4 }}>•</span>
                <span>Nenhuma ocorrência</span>
              </div>
            ) : (
              <div>
                {abaixoIdade.slice(0, 3).map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{item.nome}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{nivelLabel(item.nivel)} · {item.idade} anos</div>
                    </div>
                    <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 5, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>mín. {item.idadeMinima} anos</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: "1 1 220px", border: "1px solid #d1d5db", borderRadius: 8, padding: 16, background: "#fff" }}>
            <SectionLabel>Presença do mês</SectionLabel>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Presentes</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>{presencaGeralMes.presentes}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Faltas</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{presencaGeralMes.faltas}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Justificadas</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>{presencaGeralMes.justificadas}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", marginTop: 8, paddingTop: 8, borderTop: "2px solid #f1f5f9" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Taxa</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>{presencaGeralMes.pct}%</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "1 1 240px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
            <SectionLabel>Top 5 catequistas</SectionLabel>
            {topCatequistas.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Sem dados</div>
            ) : (
              <div>
                {topCatequistas.map((cat, idx) => (
                  <div key={cat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: idx < topCatequistas.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", width: 20 }}>{idx + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{cat.nome}</span>
                    </div>
                    <span style={{ background: "#f1f5f9", color: "#0f172a", borderRadius: 5, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{cat.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: "1 1 240px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
            <SectionLabel>Maiores faltadores</SectionLabel>
            {topFaltas.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Sem dados</div>
            ) : (
              <div>
                {topFaltas.map((item, idx) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: idx < topFaltas.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", width: 20 }}>{idx + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{item.nome}</span>
                    </div>
                    <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 5, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{item.faltas}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: "#f8fafc", minHeight: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Minha turma</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{comunidade?.nome ?? "Comunidade"} · {catequista?.nome ?? "Catequista"} · {nivelLabelResumo}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <MetricCard cor="#1e40af" label="Catequizandos" valor={catequizandos.length} sub="na minha turma" />
        <MetricCard cor="#15803d" label="Presentes hoje" valor={presentesHoje} sub="neste encontro" />
        <MetricCard cor="#dc2626" label="Faltas hoje" valor={faltasHoje} sub="neste encontro" />
        <MetricCard cor="#d97706" label="% presença" valor={`${pctPresenca}%`} sub="média do mês" />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 14 }}>
        <SectionLabel>Presença nos últimos encontros</SectionLabel>
        <div style={{ width: "100%", height: 160 }}>
          <Suspense fallback={<div style={{ fontSize: 11, color: "#94a3b8" }}>Carregando...</div>}>
            <HistoricoBarChart data={historico} />
          </Suspense>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
        <SectionLabel>{`Chamada de hoje · ${presentesHoje} presentes · ${faltasHoje} faltas · ${naoMarcadosHoje} não marcados`}</SectionLabel>
        <div style={{ display: "grid", gap: 7, gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))" }}>
          {statusCards.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{item.nome}</p>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: item.status === "presente" ? "#dcfce7" : item.status === "falta" ? "#fee2e2" : "#f1f5f9",
                  color: item.status === "presente" ? "#15803d" : item.status === "falta" ? "#dc2626" : "#94a3b8",
                }}
              >
                {item.status === "presente" ? "✓" : item.status === "falta" ? "✗" : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
          <SectionLabel>Histórico de faltas</SectionLabel>
          {catequizandos.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Sem alunos</div>
          ) : (
            <div>
              {catequizandos.map((item) => {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const faltasMesAluno = presencas.filter((p) => p.catequizando_id === item.id && p.status === "falta" && p.data_presenca.startsWith(currentMonth)).length;
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{item.nome}</span>
                    <span style={{ background: faltasMesAluno > 0 ? "#fee2e2" : "#f1f5f9", color: faltasMesAluno > 0 ? "#dc2626" : "#64748b", borderRadius: 5, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{faltasMesAluno} faltas</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 240px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
          <SectionLabel>Idade dos alunos</SectionLabel>
          {catequizandos.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Sem alunos</div>
          ) : (
            <div>
              {catequizandos.map((item) => {
                const idade = calcIdade(item.data_nascimento);
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{item.nome}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{nivelLabel(item.nivel)}</div>
                    </div>
                    <span style={{ background: "#f1f5f9", color: "#0f172a", borderRadius: 5, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{idade} anos</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Birthday widget — próximos 7 dias */}
      {(() => {
        const todayMD = new Date().toISOString().slice(5, 10);
        const nextDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return d.toISOString().slice(5, 10);
        });
        const aniversariantes = catequizandos.filter((c) => {
          if (!c.data_nascimento) return false;
          return nextDays.includes(c.data_nascimento.slice(5, 10));
        }).sort((a, b) => a.data_nascimento.slice(5, 10).localeCompare(b.data_nascimento.slice(5, 10)));

        if (aniversariantes.length === 0) return null;
        return (
          <div style={{ marginTop: 14, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🎂</span>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Aniversariantes — próximos 7 dias</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {aniversariantes.map((c) => {
                const md = c.data_nascimento.slice(5, 10);
                const isToday = md === todayMD;
                const [, mm, dd] = c.data_nascimento.split("-");
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: isToday ? "#d97706" : "#fff",
                      color: isToday ? "#fff" : "#374151",
                      border: "1px solid",
                      borderColor: isToday ? "#d97706" : "#fde68a",
                      borderRadius: 6,
                      padding: "6px 10px",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.nome}</span>
                    <span style={{ fontSize: 11, opacity: 0.75 }}>{dd}/{mm}</span>
                    {isToday && <span style={{ fontSize: 14 }}>🎉</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
