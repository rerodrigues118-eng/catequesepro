import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, type Presenca } from "@/lib/db";
import { Card, PageHeader, Field, Select, Button, SectionLabel, Badge } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/presencas")({
  head: () => ({ meta: [{ title: "Controle de Presença — CatequesePRO" }] }),
  component: Presencas,
});

function Presencas() {
  const { profile } = useAuth();
  const { db, createPresenca, refresh } = useDb();
  const isCatequista = profile?.role === "catequista";

  const defaultComunidade = isCatequista && profile?.catequista_id
    ? db.catequistas.find((c) => c.id === profile.catequista_id)?.comunidade_id ?? ""
    : "";

  const [comunidade, setComunidade] = useState<string>(defaultComunidade);
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!comunidade && defaultComunidade) {
      setComunidade(defaultComunidade);
    }
  }, [comunidade, defaultComunidade]);

  const filtered = useMemo(() => {
    let list = db.catequizandos;
    // Catequistas can only see their own students
    if (isCatequista && profile?.catequista_id) {
      list = list.filter((c) => c.catequista_id === profile.catequista_id);
    } else if (comunidade) {
      list = list.filter((c) => c.comunidade_id === comunidade);
    }
    return list;
  }, [comunidade, db.catequizandos, isCatequista, profile?.catequista_id]);


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
          {!isCatequista && (
            <Field label="Comunidade">
              <Select value={comunidade} onChange={(e) => setComunidade(e.target.value)}>
                <option value="">Todas</option>
                {db.comunidades.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Data">
            <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4">
        {rows.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{c.nome}</div>
                  <div className="text-xs text-[#64748b]">{c.nome_pai ?? "-"} / {c.nome_mae ?? "-"}</div>
                </div>
                {c.presence ? (
                  <Badge tone={c.presence.status === "presente" ? "verde" : c.presence.status === "falta" ? "amarelo" : "ambar"}>
                    {c.presence.status === "presente" ? "Presente" : c.presence.status === "falta" ? "Falta" : "Justificada"}
                  </Badge>
                ) : (
                  <Badge tone="cinza">Sem registro</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => mark(c.id, "presente")}>Presente</Button>
                <Button size="sm" variant="ghost" onClick={() => mark(c.id, "falta")}>Falta</Button>
                <Button size="sm" variant="ghost" onClick={() => mark(c.id, "justificada")}>Justificada</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
