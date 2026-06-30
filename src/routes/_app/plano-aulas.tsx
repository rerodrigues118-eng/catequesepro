import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Badge, Field, Input, Textarea, Select, ConfirmDialog, EmptyState, SectionLabel } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/plano-aulas")({
  head: () => ({ meta: [{ title: "Plano de Aulas — CatequesePRO" }] }),
  component: PlanoAulasPage,
});

interface PlanoAula {
  id: string;
  titulo: string;
  data_encontro?: string | null;
  tema?: string | null;
  descricao?: string | null;
  status: string;
  ordem?: number | null;
  ano: number;
  nivel: string;
  catequista_id?: string | null;
  comunidade_id?: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  planejado: { bg: "#f1f5f9", color: "#64748b", label: "Planejado" },
  realizado: { bg: "#dcfce7", color: "#15803d", label: "Realizado" },
  cancelado: { bg: "#fee2e2", color: "#dc2626", label: "Cancelado" },
};

const EMPTY_FORM = {
  titulo: "",
  data_encontro: "",
  tema: "",
  descricao: "",
  status: "planejado",
  ordem: "",
  nivel: "iniciacao",
};

function formatarData(dataStr: string | null | undefined) {
  if (!dataStr) return "";
  try {
    const datePart = dataStr.includes("T") ? dataStr.split("T")[0] : dataStr.split(" ")[0];
    const parts = datePart.split("-");
    if (parts.length !== 3) return dataStr;
    const [ano, mes, dia] = parts;
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dataStr;
  }
}

function PlanoAulasPage() {
  const { profile } = useAuth();
  const { db } = useDb();
  const [plano, setPlano] = useState<PlanoAula[]>([]);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PlanoAula | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const catequista = profile?.catequista_id && db?.catequistas
    ? db.catequistas.find((c) => c.id === profile.catequista_id)
    : null;

  async function load() {
    setLoading(true);
    let q = supabase.from<PlanoAula>("plano_aulas").select("*").eq("ano", ano).order("ordem", { ascending: true });
    if (profile?.role === "catequista" && profile.catequista_id) {
      q = q.eq("catequista_id", profile.catequista_id);
    }
    const { data } = await q;
    setPlano(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [ano, profile]);

  if (profile && profile.role !== "coordenacao" && profile.role !== "catequista") {
    return <Navigate to="/dashboard" replace />;
  }

  const realizados = plano.filter((p) => p.status === "realizado").length;
  const total = plano.length;
  const pct = total > 0 ? Math.round((realizados / total) * 100) : 0;

  const anoOptions = [ano - 1, ano, ano + 1];

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }
  function openEdit(p: PlanoAula) {
    setEditing(p);
    setForm({
      titulo: p.titulo,
      data_encontro: p.data_encontro ?? "",
      tema: p.tema ?? "",
      descricao: p.descricao ?? "",
      status: p.status,
      ordem: p.ordem != null ? String(p.ordem) : "",
      nivel: p.nivel,
    });
    setShowModal(true);
  }

  async function markRealizado(p: PlanoAula) {
    await supabase.from("plano_aulas").update({ status: "realizado" }).eq("id", p.id);
    void load();
  }

  async function handleSave() {
    if (!form.titulo.trim()) return;
    setSaving(true);
    const payload = {
      titulo: form.titulo,
      data_encontro: form.data_encontro || null,
      tema: form.tema || null,
      descricao: form.descricao || null,
      status: form.status,
      ordem: form.ordem ? Number(form.ordem) : null,
      ano,
      nivel: form.nivel,
      catequista_id: profile?.catequista_id ?? null,
      comunidade_id: catequista?.comunidade_id ?? null,
    };
    if (editing) {
      await supabase.from("plano_aulas").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("plano_aulas").insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    await supabase.from("plano_aulas").delete().eq("id", deleting);
    setDeleting(null);
    void load();
  }

  return (
    <div>
      <PageHeader
        title="Plano de Aulas"
        subtitle="Organize os encontros do ano catequético"
        right={
          <div className="flex items-center gap-2">
            <Select value={String(ano)} onChange={(e) => setAno(Number(e.target.value))} className="w-28">
              {anoOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            <Button onClick={openNew}><i className="ti ti-plus" /> Novo encontro</Button>
          </div>
        }
      />

      {/* Progress bar */}
      {total > 0 && (
        <Card className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#0f172a]">{realizados} de {total} encontros realizados</span>
            <span className="text-sm font-semibold text-[#1e40af]">{pct}%</span>
          </div>
          <div className="h-[6px] rounded-full" style={{ background: "#e2e8f0" }}>
            <div className="h-[6px] rounded-full" style={{ width: `${pct}%`, background: "#1e40af", transition: "width 0.3s" }} />
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[#94a3b8]">Carregando...</p>
      ) : plano.length === 0 ? (
        <EmptyState
          icon={<i className="ti ti-calendar-event" style={{ fontSize: 48 }} />}
          title="Nenhum encontro planejado"
          subtitle={`Clique em 'Novo encontro' para iniciar o plano de ${ano}.`}
        />
      ) : (
        <div className="space-y-3">
          {plano.map((p, idx) => {
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.planejado;
            return (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#94a3b8]">#{p.ordem ?? idx + 1}</span>
                      {p.data_encontro && (
                        <span className="text-xs text-[#64748b]">
                          {formatarData(p.data_encontro)}
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#0f172a]">{p.titulo}</h3>
                    {p.tema && <p className="text-xs text-[#64748b] mt-0.5">{p.tema}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {p.status !== "realizado" && (
                      <button
                        onClick={() => markRealizado(p)}
                        title="Marcar como realizado"
                        className="p-1.5 rounded-lg text-[#15803d] hover:bg-[#dcfce7]"
                      >
                        <i className="ti ti-check" style={{ fontSize: 16 }} />
                      </button>
                    )}
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-[#64748b] hover:bg-[#f1f5f9]" title="Editar">
                      <i className="ti ti-pencil" style={{ fontSize: 16 }} />
                    </button>
                    <button onClick={() => setDeleting(p.id)} className="p-1.5 rounded-lg text-[#dc2626] hover:bg-[#fee2e2]" title="Excluir">
                      <i className="ti ti-trash" style={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
          <div className="bg-white rounded-[12px] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <h2 className="text-base font-semibold mb-4">{editing ? "Editar encontro" : "Novo encontro"}</h2>
            <div className="space-y-3">
              <Field label="Título" required>
                <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título do encontro" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data">
                  <Input type="date" value={form.data_encontro} onChange={(e) => setForm((f) => ({ ...f, data_encontro: e.target.value }))} />
                </Field>
                <Field label="Ordem">
                  <Input type="number" value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))} min={1} placeholder="Nº" />
                </Field>
              </div>
              <Field label="Nível">
                <Select value={form.nivel} onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))}>
                  <option value="iniciacao">Iniciação</option>
                  <option value="primeira_eucaristia">Primeira Eucaristia</option>
                  <option value="crisma">Crisma</option>
                </Select>
              </Field>
              <Field label="Tema / Conteúdo principal">
                <Input value={form.tema} onChange={(e) => setForm((f) => ({ ...f, tema: e.target.value }))} placeholder="Ex: A Criação e o Amor de Deus" />
              </Field>
              <Field label="Descrição / Roteiro">
                <Textarea rows={4} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o roteiro do encontro..." />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="planejado">Planejado</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Cancelado</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.titulo}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir encontro"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
