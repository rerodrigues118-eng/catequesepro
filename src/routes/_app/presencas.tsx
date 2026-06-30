import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, type Presenca } from "@/lib/db";
import { Card, PageHeader, Field, Select, Button, SectionLabel, Badge, Input } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/presencas")({
  head: () => ({ meta: [{ title: "Controle de Presença — CatequesePRO" }] }),
  component: Presencas,
});

function Presencas() {
  const { profile } = useAuth();
  const { db, createPresenca, refresh } = useDb();
  const isCatequista = profile?.role === "catequista";

  if (profile && profile.role !== "admin" && profile.role !== "coordenacao" && profile.role !== "catequista") {
    return <Navigate to="/dashboard" replace />;
  }

  const defaultComunidade = isCatequista && profile?.catequista_id
    ? db.catequistas.find((c) => c.id === profile.catequista_id)?.comunidade_id ?? ""
    : "";

  const [comunidade, setComunidade] = useState<string>(defaultComunidade);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!comunidade && defaultComunidade) {
      setComunidade(defaultComunidade);
    }
  }, [comunidade, defaultComunidade]);

  // Search filter and community filter
  const filtered = useMemo(() => {
    let list = db.catequizandos;

    // Filter by community
    if (comunidade) {
      list = list.filter((c) => c.comunidade_id === comunidade);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.nome_pai && c.nome_pai.toLowerCase().includes(q)) ||
          (c.nome_mae && c.nome_mae.toLowerCase().includes(q)) ||
          (c.nome_responsavel && (c as any).nome_responsavel.toLowerCase().includes(q))
      );
    }

    return list;
  }, [comunidade, db.catequizandos, searchQuery]);

  // Stats calculation
  const statsByStudent = useMemo(() => {
    const stats: Record<string, { presentes: number; faltas: number; justificadas: number }> = {};
    db.presencas.forEach((p) => {
      if (!stats[p.catequizando_id]) {
        stats[p.catequizando_id] = { presentes: 0, faltas: 0, justificadas: 0 };
      }
      if (p.status === "presente") {
        stats[p.catequizando_id].presentes += 1;
      } else if (p.status === "falta") {
        stats[p.catequizando_id].faltas += 1;
      } else if (p.status === "justificada") {
        stats[p.catequizando_id].justificadas += 1;
      }
    });
    return stats;
  }, [db.presencas]);

  const marksByStudent = useMemo(() => {
    return db.presencas.reduce<Record<string, Presenca>>((acc, presenca) => {
      if (presenca.data_presenca === data) {
        acc[presenca.catequizando_id] = presenca;
      }
      return acc;
    }, {});
  }, [data, db.presencas]);

  const mark = async (id: string, status: Presenca["status"]) => {
    await createPresenca({ catequizando_id: id, data_presenca: data, status });
    await refresh();
  };

  const rows = filtered.map((c) => ({
    ...c,
    presence: marksByStudent[c.id],
  }));

  return (
    <div>
      <PageHeader title="Controle de Presença" subtitle="Registro de frequência" />

      <Card>
        <SectionLabel>Filtro</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Comunidade">
            <Select value={comunidade} onChange={(e) => setComunidade(e.target.value)}>
              <option value="">Todas</option>
              {db.comunidades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pesquisar por catequizando">
            <Input
              placeholder="Buscar por nome ou responsável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Field>
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4">
        {rows.length === 0 ? (
          <Card className="text-center py-8 text-sm text-[#64748b]">
            Nenhum catequizando encontrado com os filtros selecionados.
          </Card>
        ) : (
          rows.map((c) => {
            const stats = statsByStudent[c.id] || { presentes: 0, faltas: 0, justificadas: 0 };
            return (
              <Card key={c.id}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{c.nome}</div>
                      <div className="text-xs text-[#64748b]">
                        Pais: {c.nome_pai || "—"} / {c.nome_mae || "—"}
                      </div>
                      <div className="flex gap-2 mt-1.5 text-[11px]">
                        <span className="text-emerald-700 font-medium">Presenças: {stats.presentes}</span>
                        <span className="text-[#cbd5e1]">·</span>
                        <span className="text-rose-600 font-medium">Faltas: {stats.faltas}</span>
                        {stats.justificadas > 0 && (
                          <>
                            <span className="text-[#cbd5e1]">·</span>
                            <span className="text-amber-600 font-medium">Justificadas: {stats.justificadas}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {c.presence ? (
                      <Badge
                        tone={
                          c.presence.status === "presente"
                            ? "verde"
                            : c.presence.status === "falta"
                            ? "amarelo"
                            : "ambar"
                        }
                      >
                        {c.presence.status === "presente"
                          ? "Presente"
                          : c.presence.status === "falta"
                          ? "Falta"
                          : "Justificada"}
                      </Badge>
                    ) : (
                      <Badge tone="cinza">Sem registro</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#f1f5f9]">
                    <Button
                      size="sm"
                      variant={c.presence?.status === "presente" ? "primary" : "secondary"}
                      onClick={() => mark(c.id, "presente")}
                    >
                      Presente
                    </Button>
                    <Button
                      size="sm"
                      variant={c.presence?.status === "falta" ? "destructive" : "secondary"}
                      onClick={() => mark(c.id, "falta")}
                    >
                      Falta
                    </Button>
                    <Button
                      size="sm"
                      variant={c.presence?.status === "justificada" ? "secondary" : "secondary"}
                      style={
                        c.presence?.status === "justificada"
                          ? { backgroundColor: "#fef3c7", color: "#d97706", borderColor: "#fde68a" }
                          : undefined
                      }
                      onClick={() => mark(c.id, "justificada")}
                    >
                      Justificada
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
