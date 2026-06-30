import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Field, Input, Select, ConfirmDialog, EmptyState } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/matriculas")({
  head: () => ({ meta: [{ title: "Matrículas — CatequesePRO" }] }),
  component: MatriculasPage,
});

interface Turma {
  id: string;
  catequista_id?: string | null;
  comunidade_id?: string | null;
  paroquia_id?: string | null;
  ano: number;
  nivel: string;
  nome_turma?: string | null;
  max_vagas?: number | null;
  matriculas_abertas?: boolean;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  created_at: string;
}
interface ListaEspera {
  id: string;
  turma_id: string;
  nome_responsavel: string;
  nome_catequizando: string;
  data_nascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  posicao?: number | null;
  status?: string | null;
  created_at: string;
}

const NIVEL_LABEL: Record<string, string> = {
  iniciacao: "Iniciação",
  primeira_eucaristia: "1ª Eucaristia",
  crisma: "Crisma",
};

const EMPTY_FORM = {
  catequista_id: "",
  comunidade_id: "",
  nivel: "iniciacao",
  nome_turma: "",
  max_vagas: "30",
  periodo_inicio: "",
  periodo_fim: "",
  matriculas_abertas: true,
};

const EMPTY_ESPERA = {
  nome_responsavel: "",
  nome_catequizando: "",
  data_nascimento: "",
  telefone: "",
  email: "",
};

function MatriculasPage() {
  const { profile } = useAuth();
  const { db } = useDb();

  const isCoord = profile?.role === "admin" || profile?.role === "coordenacao";
  const [ano, setAno] = useState(new Date().getFullYear());
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [espera, setEspera] = useState<ListaEspera[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [showEsperaModal, setShowEsperaModal] = useState<string | null>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [esperaForm, setEsperaForm] = useState({ ...EMPTY_ESPERA });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from<Turma>("turmas_vagas").select("*").eq("ano", ano).order("nivel");
    if (!isCoord && profile?.catequista_id) {
      q = q.eq("catequista_id", profile.catequista_id);
    }
    const [{ data: turmasData }, { data: esperaData }] = await Promise.all([
      q,
      supabase.from<ListaEspera>("lista_espera").select("*").order("posicao"),
    ]);
    setTurmas(turmasData ?? []);
    setEspera(esperaData ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [ano, profile]);

  if (profile && profile.role !== "admin" && profile.role !== "coordenacao") {
    return <Navigate to="/dashboard" replace />;
  }

  function matriculadosCount(turmaId: string) {
    return db.catequizandos.filter((c) => {
      const t = turmas.find((t) => t.id === turmaId);
      return t && c.catequista_id === t.catequista_id && c.comunidade_id === t.comunidade_id;
    }).length;
  }

  function vagasColor(pct: number) {
    if (pct >= 95) return "#dc2626";
    if (pct >= 80) return "#d97706";
    return "#1e40af";
  }

  function nomeCatequista(id?: string | null) {
    return id ? (db.catequistas.find((c) => c.id === id)?.nome ?? "—") : "—";
  }
  function nomeComunidade(id?: string | null) {
    return id ? (db.comunidades.find((c) => c.id === id)?.nome ?? "—") : "—";
  }

  async function handleSaveTurma() {
    if (!form.nivel) return;
    setSaving(true);
    await supabase.from("turmas_vagas").insert({
      catequista_id: form.catequista_id || null,
      comunidade_id: form.comunidade_id || null,
      nivel: form.nivel,
      nome_turma: form.nome_turma || null,
      max_vagas: form.max_vagas ? Number(form.max_vagas) : null,
      periodo_inicio: form.periodo_inicio || null,
      periodo_fim: form.periodo_fim || null,
      matriculas_abertas: form.matriculas_abertas,
      ano,
    });
    setSaving(false);
    setShowTurmaModal(false);
    void load();
  }

  async function toggleMatriculas(t: Turma) {
    await supabase.from("turmas_vagas").update({ matriculas_abertas: !t.matriculas_abertas }).eq("id", t.id);
    void load();
  }

  async function handleSaveEspera() {
    if (!showEsperaModal || !esperaForm.nome_catequizando || !esperaForm.nome_responsavel) return;
    setSaving(true);
    const maxPos = espera.filter((e) => e.turma_id === showEsperaModal).length + 1;
    await supabase.from("lista_espera").insert({
      turma_id: showEsperaModal,
      nome_responsavel: esperaForm.nome_responsavel,
      nome_catequizando: esperaForm.nome_catequizando,
      data_nascimento: esperaForm.data_nascimento || null,
      telefone: esperaForm.telefone || null,
      email: esperaForm.email || null,
      posicao: maxPos,
      status: "aguardando",
    });
    setSaving(false);
    setShowEsperaModal(null);
    setEsperaForm({ ...EMPTY_ESPERA });
    void load();
  }

  async function chamarProximo(e: ListaEspera) {
    await supabase.from("lista_espera").update({ status: "chamado" }).eq("id", e.id);
    void load();
  }

  const anoOptions = [ano - 1, ano, ano + 1];
  const esperaTurma = turmaSelecionada ? espera.filter((e) => e.turma_id === turmaSelecionada.id) : [];

  return (
    <div>
      <PageHeader
        title="Matrículas"
        subtitle="Controle de vagas e lista de espera"
        right={
          <div className="flex items-center gap-2">
            <Select value={String(ano)} onChange={(e) => setAno(Number(e.target.value))} className="w-28">
              {anoOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            {isCoord && <Button onClick={() => { setForm({ ...EMPTY_FORM }); setShowTurmaModal(true); }}><i className="ti ti-plus" /> Nova turma</Button>}
          </div>
        }
      />

      {turmaSelecionada ? (
        // Detalhe da turma
        <div>
          <button onClick={() => setTurmaSelecionada(null)} className="flex items-center gap-1 text-sm text-[#1e40af] mb-4 hover:underline">
            <i className="ti ti-arrow-left" /> Voltar às turmas
          </button>
          <Card className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{turmaSelecionada.nome_turma ?? NIVEL_LABEL[turmaSelecionada.nivel]}</h2>
                <p className="text-sm text-[#64748b]">{nomeCatequista(turmaSelecionada.catequista_id)} · {nomeComunidade(turmaSelecionada.comunidade_id)}</p>
              </div>
              {isCoord && (
                <Button variant="secondary" onClick={() => setShowEsperaModal(turmaSelecionada.id)}>
                  <i className="ti ti-user-plus" /> Adicionar à espera
                </Button>
              )}
            </div>
          </Card>

          {/* Lista de espera */}
          <h3 className="text-sm font-semibold text-[#374151] mb-3">Lista de espera ({esperaTurma.length})</h3>
          {esperaTurma.length === 0 ? (
            <EmptyState icon={<i className="ti ti-user-plus" style={{ fontSize: 40 }} />} title="Lista de espera vazia" />
          ) : (
            <div className="space-y-2">
              {esperaTurma.map((e) => (
                <Card key={e.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[#94a3b8]">#{e.posicao}</span>
                      <div>
                        <p className="text-sm font-medium text-[#0f172a]">{e.nome_catequizando}</p>
                        <p className="text-xs text-[#64748b]">Resp.: {e.nome_responsavel} · {e.telefone ?? ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-medium rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: e.status === "chamado" ? "#dcfce7" : "#f1f5f9",
                          color: e.status === "chamado" ? "#15803d" : "#64748b",
                        }}
                      >
                        {e.status === "chamado" ? "Chamado" : "Aguardando"}
                      </span>
                      {isCoord && e.status !== "chamado" && (
                        <Button variant="secondary" onClick={() => chamarProximo(e)}>
                          <i className="ti ti-bell" /> Chamar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <p className="text-sm text-[#94a3b8]">Carregando...</p>
      ) : turmas.length === 0 ? (
        <EmptyState
          icon={<i className="ti ti-user-plus" style={{ fontSize: 48 }} />}
          title="Nenhuma turma cadastrada"
          subtitle={isCoord ? `Clique em 'Nova turma' para criar para ${ano}.` : "Você não possui turmas cadastradas."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {turmas.map((t) => {
            const matriculados = matriculadosCount(t.id);
            const max = t.max_vagas ?? 30;
            const pct = max > 0 ? Math.round((matriculados / max) * 100) : 0;
            const cor = vagasColor(pct);
            const esperaCount = espera.filter((e) => e.turma_id === t.id).length;
            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0f172a]">{t.nome_turma ?? NIVEL_LABEL[t.nivel]}</h3>
                    <p className="text-xs text-[#64748b]">{nomeCatequista(t.catequista_id)}</p>
                    <p className="text-xs text-[#94a3b8]">{nomeComunidade(t.comunidade_id)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-[10px] font-medium rounded-full px-2 py-0.5"
                      style={{ backgroundColor: t.matriculas_abertas ? "#dcfce7" : "#f1f5f9", color: t.matriculas_abertas ? "#15803d" : "#94a3b8" }}
                    >
                      {t.matriculas_abertas ? "Matrículas abertas" : "Fechado"}
                    </span>
                    {isCoord && (
                      <button onClick={() => toggleMatriculas(t)} className="text-[10px] text-[#1e40af] hover:underline">Alterar</button>
                    )}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748b]">{matriculados}/{max} vagas</span>
                    <span style={{ color: cor, fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div className="h-[6px] rounded-full bg-[#e2e8f0]">
                    <div className="h-[6px] rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cor }} />
                  </div>
                </div>
                {t.periodo_inicio && (
                  <p className="text-xs text-[#94a3b8] mb-3">
                    Período: {new Date(t.periodo_inicio + "T00:00:00").toLocaleDateString("pt-BR")}
                    {t.periodo_fim ? ` a ${new Date(t.periodo_fim + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTurmaSelecionada(t)}
                    className="text-xs font-medium text-[#1e40af] hover:underline"
                  >
                    Ver detalhes
                  </button>
                  {esperaCount > 0 && (
                    <button onClick={() => setTurmaSelecionada(t)} className="text-xs text-[#d97706]">
                      {esperaCount} em espera
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal nova turma */}
      {showTurmaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
          <div className="bg-white rounded-[12px] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <h2 className="text-base font-semibold mb-4">Nova turma</h2>
            <div className="space-y-3">
              <Field label="Catequista">
                <Select value={form.catequista_id} onChange={(e) => setForm((f) => ({ ...f, catequista_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {db.catequistas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </Field>
              <Field label="Comunidade">
                <Select value={form.comunidade_id} onChange={(e) => setForm((f) => ({ ...f, comunidade_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {db.comunidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </Field>
              <Field label="Nível">
                <Select value={form.nivel} onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))}>
                  <option value="iniciacao">Iniciação</option>
                  <option value="primeira_eucaristia">1ª Eucaristia</option>
                  <option value="crisma">Crisma</option>
                </Select>
              </Field>
              <Field label="Nome da turma (opcional)">
                <Input value={form.nome_turma} onChange={(e) => setForm((f) => ({ ...f, nome_turma: e.target.value }))} placeholder="Ex: Turma A" />
              </Field>
              <Field label="Máximo de vagas">
                <Input type="number" value={form.max_vagas} onChange={(e) => setForm((f) => ({ ...f, max_vagas: e.target.value }))} min={1} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Período início">
                  <Input type="date" value={form.periodo_inicio} onChange={(e) => setForm((f) => ({ ...f, periodo_inicio: e.target.value }))} />
                </Field>
                <Field label="Período fim">
                  <Input type="date" value={form.periodo_fim} onChange={(e) => setForm((f) => ({ ...f, periodo_fim: e.target.value }))} />
                </Field>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.matriculas_abertas} onChange={(e) => setForm((f) => ({ ...f, matriculas_abertas: e.target.checked }))} className="w-4 h-4 accent-[#1e40af]" />
                <span className="text-sm">Abrir matrículas agora</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowTurmaModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveTurma} disabled={saving}>
                {saving ? "Salvando..." : "Criar turma"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lista de espera */}
      {showEsperaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
          <div className="bg-white rounded-[12px] p-6 w-full max-w-md" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <h2 className="text-base font-semibold mb-4">Adicionar à lista de espera</h2>
            <div className="space-y-3">
              <Field label="Nome do responsável" required>
                <Input value={esperaForm.nome_responsavel} onChange={(e) => setEsperaForm((f) => ({ ...f, nome_responsavel: e.target.value }))} />
              </Field>
              <Field label="Nome do catequizando" required>
                <Input value={esperaForm.nome_catequizando} onChange={(e) => setEsperaForm((f) => ({ ...f, nome_catequizando: e.target.value }))} />
              </Field>
              <Field label="Data de nascimento">
                <Input type="date" value={esperaForm.data_nascimento} onChange={(e) => setEsperaForm((f) => ({ ...f, data_nascimento: e.target.value }))} />
              </Field>
              <Field label="Telefone">
                <Input value={esperaForm.telefone} onChange={(e) => setEsperaForm((f) => ({ ...f, telefone: e.target.value }))} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={esperaForm.email} onChange={(e) => setEsperaForm((f) => ({ ...f, email: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowEsperaModal(null)}>Cancelar</Button>
              <Button onClick={handleSaveEspera} disabled={saving || !esperaForm.nome_catequizando || !esperaForm.nome_responsavel}>
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
