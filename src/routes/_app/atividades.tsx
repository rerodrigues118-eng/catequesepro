import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Field, Input, Textarea, Select, ConfirmDialog, EmptyState } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/atividades")({
  head: () => ({ meta: [{ title: "Atividades e Avaliações — CatequesePRO" }] }),
  component: AtividadesPage,
});

interface AtividadeAvaliacao {
  id: string;
  catequizando_id: string;
  catequista_id?: string | null;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  conceito?: string | null;
  data_atividade?: string | null;
  observacoes?: string | null;
  created_at: string;
}

const TIPO: Record<string, { bg: string; color: string; label: string }> = {
  participacao: { bg: "#dbeafe", color: "#1e40af", label: "Participação" },
  trabalho: { bg: "#fef3c7", color: "#d97706", label: "Trabalho" },
  dinamica: { bg: "#dcfce7", color: "#15803d", label: "Dinâmica" },
  avaliacao: { bg: "#ede9fe", color: "#7c3aed", label: "Avaliação" },
};
const CONCEITO: Record<string, { bg: string; color: string; label: string }> = {
  otimo: { bg: "#dcfce7", color: "#15803d", label: "Ótimo" },
  bom: { bg: "#dbeafe", color: "#1e40af", label: "Bom" },
  regular: { bg: "#fef3c7", color: "#d97706", label: "Regular" },
  insuficiente: { bg: "#fee2e2", color: "#dc2626", label: "Insuficiente" },
};

const EMPTY_FORM = {
  catequizando_id: "",
  titulo: "",
  tipo: "participacao",
  conceito: "bom",
  data_atividade: new Date().toISOString().slice(0, 10),
  observacoes: "",
};

function AtividadesPage() {
  const { profile } = useAuth();
  const { db } = useDb();
  const isCoord = profile?.role === "admin" || profile?.role === "coordenacao";
  const [atividades, setAtividades] = useState<AtividadeAvaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAluno, setFiltroAluno] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AtividadeAvaliacao | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const meusCatequizandos = useMemo(() => {
    if (profile?.role === "catequista" && profile.catequista_id) {
      return db.catequizandos.filter((c) => c.catequista_id === profile.catequista_id);
    }
    return db.catequizandos;
  }, [db.catequizandos, profile]);

  async function load() {
    setLoading(true);
    let q = supabase.from<AtividadeAvaliacao>("atividades_avaliacao").select("*").order("data_atividade", { ascending: false });
    if (profile?.role === "catequista" && profile.catequista_id) {
      q = q.eq("catequista_id", profile.catequista_id);
    }
    const { data } = await q;
    setAtividades(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [profile]);

  const filtered = useMemo(() => {
    if (!filtroAluno) return atividades;
    return atividades.filter((a) => a.catequizando_id === filtroAluno);
  }, [atividades, filtroAluno]);

  if (profile && profile.role !== "coordenacao" && profile.role !== "catequista") {
    return <Navigate to="/dashboard" replace />;
  }

  function nomeAluno(id: string) {
    return db.catequizandos.find((c) => c.id === id)?.nome ?? id;
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, catequizando_id: meusCatequizandos[0]?.id ?? "" });
    setShowModal(true);
  }
  function openEdit(a: AtividadeAvaliacao) {
    setEditing(a);
    setForm({
      catequizando_id: a.catequizando_id,
      titulo: a.titulo,
      tipo: a.tipo ?? "participacao",
      conceito: a.conceito ?? "bom",
      data_atividade: a.data_atividade ?? "",
      observacoes: a.observacoes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.titulo || !form.catequizando_id) return;
    setSaving(true);
    const payload = {
      ...form,
      catequista_id: profile?.catequista_id ?? null,
      data_atividade: form.data_atividade || null,
    };
    if (editing) {
      await supabase.from("atividades_avaliacao").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("atividades_avaliacao").insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    await supabase.from("atividades_avaliacao").delete().eq("id", deleting);
    setDeleting(null);
    void load();
  }

  return (
    <div>
      <PageHeader
        title="Atividades e Avaliações"
        subtitle="Registro de atividades e conceitos dos catequizandos"
        right={<Button onClick={openNew}><i className="ti ti-plus" /> Registrar atividade</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div style={{ minWidth: 200, flex: 1, maxWidth: 320 }}>
          <Select value={filtroAluno} onChange={(e) => setFiltroAluno(e.target.value)}>
            <option value="">Todos os catequizandos</option>
            {meusCatequizandos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#94a3b8]">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<i className="ti ti-clipboard-list" style={{ fontSize: 48 }} />}
          title="Nenhuma atividade registrada"
          subtitle="Clique em 'Registrar atividade' para começar."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b]">Catequizando</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b]">Título</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b]">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b]">Conceito</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b]">Data</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => {
                    const t = TIPO[a.tipo ?? ""] ?? TIPO.participacao;
                    const c = CONCEITO[a.conceito ?? ""] ?? CONCEITO.bom;
                    return (
                      <tr key={a.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <td className="px-4 py-3 font-medium text-[#0f172a]">{nomeAluno(a.catequizando_id)}</td>
                        <td className="px-4 py-3 text-[#374151]">{a.titulo}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: t.bg, color: t.color }}>{t.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: c.bg, color: c.color }}>{c.label}</span>
                        </td>
                        <td className="px-4 py-3 text-[#64748b]">
                          {a.data_atividade ? new Date(a.data_atividade + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(a)} className="p-1 text-[#64748b] hover:text-[#1e40af]"><i className="ti ti-pencil" style={{ fontSize: 15 }} /></button>
                            <button onClick={() => setDeleting(a.id)} className="p-1 text-[#64748b] hover:text-[#dc2626]"><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((a) => {
              const t = TIPO[a.tipo ?? ""] ?? TIPO.participacao;
              const c = CONCEITO[a.conceito ?? ""] ?? CONCEITO.bom;
              return (
                <Card key={a.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#94a3b8] mb-0.5">{nomeAluno(a.catequizando_id)}</p>
                      <p className="text-sm font-semibold text-[#0f172a]">{a.titulo}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(a)} className="p-1 text-[#64748b]"><i className="ti ti-pencil" style={{ fontSize: 15 }} /></button>
                      <button onClick={() => setDeleting(a.id)} className="p-1 text-[#dc2626]"><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: t.bg, color: t.color }}>{t.label}</span>
                    <span className="inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: c.bg, color: c.color }}>{c.label}</span>
                    {a.data_atividade && <span className="text-xs text-[#94a3b8] self-center">{new Date(a.data_atividade + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
          <div className="bg-white rounded-[12px] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <h2 className="text-base font-semibold mb-4">{editing ? "Editar atividade" : "Registrar atividade"}</h2>
            <div className="space-y-3">
              <Field label="Catequizando" required>
                <Select value={form.catequizando_id} onChange={(e) => setForm((f) => ({ ...f, catequizando_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {meusCatequizandos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </Field>
              <Field label="Título da atividade" required>
                <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Dinâmica sobre partilha" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                    <option value="participacao">Participação</option>
                    <option value="trabalho">Trabalho</option>
                    <option value="dinamica">Dinâmica</option>
                    <option value="avaliacao">Avaliação</option>
                  </Select>
                </Field>
                <Field label="Conceito">
                  <Select value={form.conceito} onChange={(e) => setForm((f) => ({ ...f, conceito: e.target.value }))}>
                    <option value="otimo">Ótimo</option>
                    <option value="bom">Bom</option>
                    <option value="regular">Regular</option>
                    <option value="insuficiente">Insuficiente</option>
                  </Select>
                </Field>
              </div>
              <Field label="Data da atividade">
                <Input type="date" value={form.data_atividade} onChange={(e) => setForm((f) => ({ ...f, data_atividade: e.target.value }))} />
              </Field>
              <Field label="Observações (opcional)">
                <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Observações sobre o desempenho..." />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.titulo || !form.catequizando_id}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir atividade"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
