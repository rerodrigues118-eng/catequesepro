import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Field, Input, Textarea, Select, ConfirmDialog, EmptyState } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/calendario")({
  head: () => ({ meta: [{ title: "Calendário — CatequesePRO" }] }),
  component: CalendarioPage,
});

interface Evento {
  id: string;
  titulo: string;
  descricao?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  local_evento?: string | null;
  tipo?: string | null;
  para_todos?: boolean;
  comunidade_id?: string | null;
  cor?: string | null;
  created_at?: string;
  _source?: "paroquial" | "liturgico";
}

const TIPO_CORES: Record<string, string> = {
  evento_paroquial: "#1e40af",
  liturgico: "#7c3aed",
  sacramento: "#d97706",
  retiro: "#15803d",
  reuniao: "#64748b",
};

const COR_OPCOES = ["#1e40af", "#7c3aed", "#d97706", "#15803d", "#dc2626", "#64748b"];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const EMPTY_FORM = {
  titulo: "",
  descricao: "",
  data_inicio: "",
  data_fim: "",
  hora_inicio: "",
  hora_fim: "",
  local_evento: "",
  tipo: "evento_paroquial",
  para_todos: true,
  comunidade_id: "",
  cor: "#1e40af",
};

function CalendarioPage() {
  const { profile } = useAuth();
  const { db } = useDb();
  const isCoord = profile?.role === "admin" || profile?.role === "coordenacao";

  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth());
  const [view, setView] = useState<"mes" | "lista">("mes");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: paroquiais }, { data: liturgicos }] = await Promise.all([
      supabase.from<Evento>("eventos_paroquiais").select("*").order("data_inicio"),
      supabase.from<Evento>("calendario_liturgico").select("*").order("data"),
    ]);
    const todos: Evento[] = [
      ...(paroquiais ?? []).map((e) => ({ ...e, _source: "paroquial" as const })),
      ...(liturgicos ?? []).map((e) => ({ ...e, data_inicio: (e as { data?: string }).data ?? "", _source: "liturgico" as const, cor: e.cor ?? "#7c3aed" })),
    ];
    setEventos(todos);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const mesStr = `${ano}-${String(mes + 1).padStart(2, "0")}`;

  function nomeComunidade(id?: string | null) {
    return id ? (db.comunidades.find((c) => c.id === id)?.nome ?? "—") : "—";
  }

  const userComunidadeId = useMemo(() => {
    if (!profile?.catequista_id) return null;
    return db.catequistas.find((c) => c.id === profile.catequista_id)?.comunidade_id ?? null;
  }, [profile, db.catequistas]);

  const eventosFiltrados = useMemo(() => {
    if (isCoord) return eventos;
    return eventos.filter((e) => {
      return e._source === "liturgico" || e.para_todos || e.comunidade_id === userComunidadeId;
    });
  }, [eventos, isCoord, userComunidadeId]);

  const eventosMes = useMemo(() => eventosFiltrados.filter((e) => e.data_inicio?.startsWith(mesStr)), [eventosFiltrados, mesStr]);

  // Build calendar days
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const todayStr = today.toISOString().slice(0, 10);

  function eventosDia(dia: number) {
    const d = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return eventosMes.filter((e) => e.data_inicio === d);
  }

  function navMes(dir: -1 | 1) {
    if (dir === -1 && mes === 0) { setMes(11); setAno((y) => y - 1); }
    else if (dir === 1 && mes === 11) { setMes(0); setAno((y) => y + 1); }
    else setMes((m) => m + dir);
  }

  async function handleSave() {
    if (!form.titulo || !form.data_inicio) return;
    setSaving(true);
    await supabase.from("eventos_paroquiais").insert({
      titulo: form.titulo,
      descricao: form.descricao || null,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || null,
      hora_inicio: form.hora_inicio || null,
      hora_fim: form.hora_fim || null,
      local_evento: form.local_evento || null,
      tipo: form.tipo,
      para_todos: form.para_todos,
      comunidade_id: form.para_todos ? null : (form.comunidade_id || null),
      cor: form.cor,
    });
    setSaving(false);
    setShowModal(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    await supabase.from("eventos_paroquiais").delete().eq("id", deleting);
    setDeleting(null);
    void load();
  }

  const diaSelecionadoEventos = diaSelecionado ? eventosFiltrados.filter((e) => e.data_inicio === diaSelecionado) : [];

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle="Eventos paroquiais e calendário litúrgico"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-[8px] overflow-hidden border border-[#e2e8f0]">
              {["mes", "lista"].map((v) => (
                <button key={v} onClick={() => setView(v as "mes" | "lista")}
                  className="px-3 py-1.5 text-sm"
                  style={{ background: view === v ? "#1e40af" : "#fff", color: view === v ? "#fff" : "#64748b" }}>
                  {v === "mes" ? "Mês" : "Lista"}
                </button>
              ))}
            </div>
            {isCoord && <Button onClick={() => { setForm({ ...EMPTY_FORM, data_inicio: diaSelecionado ?? "" }); setShowModal(true); }}><i className="ti ti-plus" /> Novo evento</Button>}
          </div>
        }
      />

      {/* Month nav */}
      <div className="flex items-center gap-4 mb-5">
        <button onClick={() => navMes(-1)} className="p-2 rounded-lg hover:bg-[#f1f5f9]"><i className="ti ti-chevron-left" style={{ fontSize: 18 }} /></button>
        <h2 className="text-base font-semibold text-[#0f172a]">{MESES[mes]} {ano}</h2>
        <button onClick={() => navMes(1)} className="p-2 rounded-lg hover:bg-[#f1f5f9]"><i className="ti ti-chevron-right" style={{ fontSize: 18 }} /></button>
      </div>

      {loading ? (
        <p className="text-sm text-[#94a3b8]">Carregando...</p>
      ) : view === "lista" ? (
        // List view (always used on mobile)
        <div className="space-y-3">
          {eventosMes.length === 0 ? (
            <EmptyState icon={<i className="ti ti-calendar-month" style={{ fontSize: 48 }} />} title="Nenhum evento este mês" />
          ) : eventosMes.map((e) => {
            const cor = e.cor ?? TIPO_CORES[e.tipo ?? ""] ?? "#1e40af";
            return (
              <div key={e.id} className="bg-white rounded-[10px] p-4 flex gap-3" style={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${cor}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-xs text-[#94a3b8]">{new Date(e.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                    {e.hora_inicio && <p className="text-xs text-[#94a3b8]">{e.hora_inicio}</p>}
                  </div>
                  <h3 className="text-sm font-semibold text-[#0f172a]">{e.titulo}</h3>
                  {e.local_evento && <p className="text-xs text-[#64748b] mt-0.5"><i className="ti ti-map-pin" /> {e.local_evento}</p>}
                  {e.comunidade_id && (
                    <p className="text-xs text-[#1e40af] mt-0.5">
                      <i className="ti ti-home" /> {nomeComunidade(e.comunidade_id)}
                    </p>
                  )}
                </div>
                {isCoord && e._source === "paroquial" && (
                  <button onClick={() => setDeleting(e.id)} className="p-1 text-[#dc2626] hover:bg-[#fee2e2] rounded">
                    <i className="ti ti-trash" style={{ fontSize: 15 }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Month grid (desktop)
        <div className="hidden sm:block">
          <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[#e2e8f0]">
              {DIAS_SEMANA.map((d, i) => (
                <div key={d} className="py-2 text-center text-xs font-semibold" style={{ color: i === 0 ? "#dc2626" : "#64748b" }}>{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: primeiroDia }, (_, i) => <div key={`e${i}`} className="min-h-[80px] border-r border-b border-[#f1f5f9]" />)}
              {Array.from({ length: diasNoMes }, (_, i) => {
                const dia = i + 1;
                const dStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const evs = eventosDia(dia);
                const isToday = dStr === todayStr;
                const isSelected = diaSelecionado === dStr;
                const isSunday = (primeiroDia + i) % 7 === 0;
                return (
                  <div
                    key={dia}
                    onClick={() => setDiaSelecionado(isSelected ? null : dStr)}
                    className="min-h-[80px] p-1.5 border-r border-b border-[#f1f5f9] cursor-pointer"
                    style={{ background: isSelected ? "#eff6ff" : "transparent" }}
                  >
                    <div className="flex items-center justify-center mb-1">
                      <span
                        className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: isToday ? "#1e40af" : "transparent",
                          color: isToday ? "#fff" : isSunday ? "#dc2626" : "#0f172a",
                          fontWeight: isToday ? 700 : 400,
                        }}
                      >{dia}</span>
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0, 2).map((e) => (
                        <div key={e.id} className="truncate text-[10px] rounded px-1 py-0.5 text-white font-medium"
                          style={{ backgroundColor: e.cor ?? TIPO_CORES[e.tipo ?? ""] ?? "#1e40af" }}>
                          {e.titulo}
                        </div>
                      ))}
                      {evs.length > 2 && <div className="text-[9px] text-[#64748b]">+{evs.length - 2} mais</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3">
            {[["Paroquial", "#1e40af"], ["Litúrgico", "#7c3aed"], ["Sacramento", "#d97706"], ["Retiro", "#15803d"], ["Reunião", "#64748b"]].map(([label, cor]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: cor }} />
                {label}
              </div>
            ))}
          </div>

          {/* Day detail panel */}
          {diaSelecionado && diaSelecionadoEventos.length > 0 && (
            <Card className="mt-4">
              <p className="text-xs font-semibold text-[#64748b] mb-3 uppercase tracking-wide">
                {new Date(diaSelecionado + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
              <div className="space-y-2">
                {diaSelecionadoEventos.map((e) => (
                  <div key={e.id} className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 mt-1 rounded-full flex-shrink-0" style={{ background: e.cor ?? TIPO_CORES[e.tipo ?? ""] ?? "#1e40af" }} />
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">{e.titulo}</p>
                      {e.hora_inicio && <p className="text-xs text-[#64748b]">{e.hora_inicio}{e.hora_fim ? ` - ${e.hora_fim}` : ""}</p>}
                      {e.local_evento && <p className="text-xs text-[#94a3b8]">{e.local_evento}</p>}
                      {e.comunidade_id && (
                        <p className="text-xs text-[#1e40af] mt-0.5">
                          <i className="ti ti-home" /> {nomeComunidade(e.comunidade_id)}
                        </p>
                      )}
                    </div>
                    {isCoord && e._source === "paroquial" && (
                      <button onClick={() => setDeleting(e.id)} className="ml-auto text-[#dc2626]"><i className="ti ti-trash" style={{ fontSize: 14 }} /></button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Mobile always shows list */}
      <div className="sm:hidden mt-4">
        <div className="space-y-3">
          {eventosMes.length === 0 ? (
            <EmptyState icon={<i className="ti ti-calendar-month" style={{ fontSize: 48 }} />} title="Nenhum evento este mês" />
          ) : eventosMes.map((e) => {
            const cor = e.cor ?? TIPO_CORES[e.tipo ?? ""] ?? "#1e40af";
            return (
              <div key={e.id} className="bg-white rounded-[10px] p-4" style={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${cor}` }}>
                <p className="text-xs text-[#94a3b8]">{new Date(e.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                <h3 className="text-sm font-semibold text-[#0f172a] mt-0.5">{e.titulo}</h3>
                {e.local_evento && <p className="text-xs text-[#64748b] mt-0.5">{e.local_evento}</p>}
                {e.comunidade_id && (
                  <p className="text-xs text-[#1e40af] mt-0.5">
                    <i className="ti ti-home" /> {nomeComunidade(e.comunidade_id)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create event modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
          <div className="bg-white rounded-[12px] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <h2 className="text-base font-semibold mb-4">Novo evento</h2>
            <div className="space-y-3">
              <Field label="Título" required>
                <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Nome do evento" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data início" required>
                  <Input type="date" value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} />
                </Field>
                <Field label="Data fim">
                  <Input type="date" value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hora início">
                  <Input type="time" value={form.hora_inicio} onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))} />
                </Field>
                <Field label="Hora fim">
                  <Input type="time" value={form.hora_fim} onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))} />
                </Field>
              </div>
              <Field label="Local">
                <Input value={form.local_evento} onChange={(e) => setForm((f) => ({ ...f, local_evento: e.target.value }))} placeholder="Local do evento" />
              </Field>
              <Field label="Tipo">
                <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="evento_paroquial">Evento Paroquial</option>
                  <option value="sacramento">Sacramento</option>
                  <option value="retiro">Retiro</option>
                  <option value="reuniao">Reunião</option>
                </Select>
              </Field>
              <Field label="Descrição">
                <Textarea rows={3} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
              </Field>
              <Field label="Cor">
                <div className="flex gap-2 mt-1">
                  {COR_OPCOES.map((c) => (
                    <button key={c} onClick={() => setForm((f) => ({ ...f, cor: c }))}
                      className="w-7 h-7 rounded-full border-2"
                      style={{ background: c, borderColor: form.cor === c ? "#0f172a" : "transparent" }} />
                  ))}
                </div>
              </Field>
              <Field label="Destinatários">
                <Select value={form.para_todos ? "todos" : "comunidade"} onChange={(e) => {
                  const paraTodos = e.target.value === "todos";
                  setForm((f) => ({
                    ...f,
                    para_todos: paraTodos,
                    comunidade_id: paraTodos ? "" : (f.comunidade_id || db.comunidades[0]?.id || "")
                  }));
                }}>
                  <option value="todos">Todos</option>
                  <option value="comunidade">Comunidade específica</option>
                </Select>
              </Field>
              {!form.para_todos && (
                <Field label="Selecione a Comunidade" required>
                  <Select value={form.comunidade_id} onChange={(e) => setForm((f) => ({ ...f, comunidade_id: e.target.value }))}>
                    <option value="">Selecione uma comunidade</option>
                    {db.comunidades.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.titulo || !form.data_inicio || (!form.para_todos && !form.comunidade_id)}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir evento"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
