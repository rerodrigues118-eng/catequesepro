import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Badge, Field, Input, Textarea, Select, ConfirmDialog, EmptyState } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/avisos")({
  head: () => ({ meta: [{ title: "Mural de Avisos — CatequesePRO" }] }),
  component: AvisosPage,
});

interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  ativo: boolean;
  data_expiracao?: string | null;
  created_at: string;
  catequista_id?: string | null;
  comunidade_id?: string | null;
  paroquia_id?: string | null;
}

const TIPO_COLORS: Record<string, string> = {
  aviso: "#1e40af",
  urgente: "#dc2626",
  informativo: "#15803d",
  lembrete: "#d97706",
};
const TIPO_LABELS: Record<string, string> = {
  aviso: "Aviso",
  urgente: "Urgente",
  informativo: "Informativo",
  lembrete: "Lembrete",
};

const EMPTY: Omit<Aviso, "id" | "created_at"> = {
  titulo: "",
  conteudo: "",
  tipo: "aviso",
  ativo: true,
  data_expiracao: null,
};

function AvisosPage() {
  const { profile } = useAuth();
  const isCoord = profile?.role === "admin" || profile?.role === "coordenacao";
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ativos" | "expirados" | "todos">("ativos");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Aviso | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [comunidades, setComunidades] = useState<{ id: string; nome: string }[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from<Aviso>("avisos_mural").select("*").order("created_at", { ascending: false });
    setAvisos(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (isCoord) {
      supabase.from("comunidades").select("id,nome").order("nome").then(({ data }) => setComunidades(data ?? []));
    }
  }, [isCoord]);

  const hoje = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (tab === "ativos") return avisos.filter((a) => a.ativo && (!a.data_expiracao || a.data_expiracao >= hoje));
    if (tab === "expirados") return avisos.filter((a) => !a.ativo || (a.data_expiracao && a.data_expiracao < hoje));
    return avisos;
  }, [avisos, tab, hoje]);

  function openNew() {
    if (!isCoord) return;
    setEditing(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  }
  function openEdit(a: Aviso) {
    if (!isCoord) return;
    setEditing(a);
    setForm({ titulo: a.titulo, conteudo: a.conteudo, tipo: a.tipo, ativo: a.ativo, data_expiracao: a.data_expiracao ?? null, catequista_id: a.catequista_id ?? null, comunidade_id: a.comunidade_id ?? null, paroquia_id: a.paroquia_id ?? null } as typeof EMPTY);
    setShowModal(true);
  }

  async function handleSave() {
    if (!isCoord) return;
    if (!form.titulo.trim() || !form.conteudo.trim()) return;
    setSaving(true);
    const payload = { ...form };
    if (editing) {
      await supabase.from("avisos_mural").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("avisos_mural").insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    void load();
  }

  async function handleDelete() {
    if (!isCoord) return;
    if (!deleting) return;
    await supabase.from("avisos_mural").delete().eq("id", deleting);
    setDeleting(null);
    void load();
  }

  const TABS = [
    { key: "ativos", label: "Ativos" },
    { key: "expirados", label: "Expirados" },
    { key: "todos", label: "Todos" },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Mural de Avisos"
        subtitle="Comunicados e lembretes para a comunidade"
        right={isCoord ? <Button onClick={openNew}><i className="ti ti-plus" /> Novo aviso</Button> : undefined}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: "1px solid #e2e8f0" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 text-sm font-medium"
            style={{
              borderBottom: tab === t.key ? "2px solid #1e40af" : "2px solid transparent",
              color: tab === t.key ? "#1e40af" : "#64748b",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#94a3b8]">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<i className="ti ti-speakerphone" style={{ fontSize: 48 }} />}
          title="Nenhum aviso encontrado"
          subtitle="Clique em 'Novo aviso' para criar o primeiro."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((a) => {
            const cor = TIPO_COLORS[a.tipo] ?? "#94a3b8";
            const expirado = a.data_expiracao && a.data_expiracao < hoje;
            return (
              <div
                key={a.id}
                className="bg-white rounded-[10px] p-4"
                style={{
                  border: "1px solid #e2e8f0",
                  borderLeft: `4px solid ${cor}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  opacity: expirado ? 0.65 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[#0f172a] leading-snug">{a.titulo}</h3>
                  <Badge
                    className="flex-shrink-0"
                    tone={a.tipo === "urgente" ? undefined : a.tipo === "informativo" ? "verde" : a.tipo === "lembrete" ? "ambar" : "azul"}
                    style={{ backgroundColor: cor + "22", color: cor } as React.CSSProperties}
                  >
                    {TIPO_LABELS[a.tipo] ?? a.tipo}
                  </Badge>
                </div>
                <p className="text-sm text-[#374151] leading-relaxed mb-3">{a.conteudo}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#94a3b8]">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    {a.data_expiracao && ` · expira em ${new Date(a.data_expiracao + "T00:00:00").toLocaleDateString("pt-BR")}`}
                  </p>
                  {isCoord && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="text-xs text-[#1e40af] hover:underline">Editar</button>
                      <button onClick={() => setDeleting(a.id)} className="text-xs text-[#dc2626] hover:underline">Excluir</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
          <div className="bg-white rounded-[12px] p-6 w-full max-w-lg" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <h2 className="text-base font-semibold mb-4">{editing ? "Editar aviso" : "Novo aviso"}</h2>
            <div className="space-y-3">
              <Field label="Título" required>
                <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título do aviso" />
              </Field>
              <Field label="Conteúdo" required>
                <Textarea rows={4} value={form.conteudo} onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))} placeholder="Descreva o aviso..." />
              </Field>
              <Field label="Tipo">
                <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="aviso">Aviso</option>
                  <option value="urgente">Urgente</option>
                  <option value="informativo">Informativo</option>
                  <option value="lembrete">Lembrete</option>
                </Select>
              </Field>
              {isCoord && (
                <Field label="Comunidade">
                  <Select value={(form as { comunidade_id?: string | null }).comunidade_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, comunidade_id: e.target.value || null }))}>
                    <option value="">Todas</option>
                    {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Data de expiração (opcional)">
                <Input type="date" value={form.data_expiracao ?? ""} onChange={(e) => setForm((f) => ({ ...f, data_expiracao: e.target.value || null }))} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.titulo || !form.conteudo}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir aviso"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
