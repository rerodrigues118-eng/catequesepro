import { createFileRoute, Link, Outlet, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Eye, Pencil, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDb, calcIdade, nivelLabel } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Avatar, Badge, Button, Card, SectionLabel } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/catequizandos/$id")({
  head: () => ({ meta: [{ title: "Ficha — CatequesePRO" }] }),
  component: FichaPage,
});

interface Sacramento {
  id: string;
  tipo: string;
  data_recebimento?: string | null;
  paroquia_local?: string | null;
  celebrante?: string | null;
  padrinhos?: string | null;
  observacoes?: string | null;
}

function FichaPage() {
  const { id } = Route.useParams();
  const { db } = useDb();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const c = db.catequizandos.find((x) => x.id === id);
  if (!c) return <Navigate to="/catequizandos" replace />;

  const [sacramentos, setSacramentos] = useState<Sacramento[]>([]);
  const [loadingSac, setLoadingSac] = useState(true);

  useEffect(() => {
    supabase
      .from<Sacramento>("sacramentos_recebidos")
      .select("*")
      .eq("catequizando_id", id)
      .then(({ data }) => {
        setSacramentos(data ?? []);
        setLoadingSac(false);
      });
  }, [id]);

  const canEdit =
    profile?.role === "admin" ||
    profile?.role === "coordenacao" ||
    (profile?.role === "catequista" && profile?.catequista_id === c.catequista_id);

  const paroquia = db.paroquias.find((p) => p.id === c.paroquia_id);
  const comunidade = db.comunidades.find((x) => x.id === c.comunidade_id);
  const catequista = db.catequistas.find((x) => x.id === c.catequista_id);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
        <Button variant="secondary" onClick={() => navigate({ to: "/catequizandos" })}>
          <ArrowLeft size={16} /> Voltar
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <Link to="/catequizandos/$id/editar" params={{ id: c.id }}>
              <Button variant="secondary">
                <Pencil size={16} /> Editar
              </Button>
            </Link>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={16} /> Imprimir ficha
          </Button>
        </div>
      </div>

      <div className="print-card">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div
                className="bg-[#f8fafc] overflow-hidden mx-auto md:mx-0 max-w-[240px]"
                style={{ aspectRatio: "1 / 1", border: "1px solid #e2e8f0", borderRadius: 8 }}
              >
                {c.foto_url ? (
                  <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar nome={c.nome} size={72} />
                  </div>
                )}
              </div>
              <div className="mt-4 text-center md:text-left">
                <h2 className="text-lg font-semibold text-[#0f172a]">{c.nome}</h2>
                <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                  {comunidade && <Badge tone="azul">{comunidade.nome}</Badge>}
                  {catequista && <Badge tone="ambar">{catequista.nome}</Badge>}
                  <Badge tone="cinza">{nivelLabel(c.nivel)}</Badge>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-5">
              <Section title="Dados pessoais">
                <Line label="Nome completo" value={c.nome} />
                <Line label="Nascimento" value={formatDate(c.data_nascimento)} />
                <Line label="Idade" value={`${calcIdade(c.data_nascimento)} anos`} />
                <Line label="Nível" value={nivelLabel(c.nivel)} />
              </Section>
              <Section title="Família">
                <Line label="Pai" value={c.nome_pai || "—"} />
                <Line label="Mãe" value={c.nome_mae || "—"} />
              </Section>
              <Section title="Endereço">
                <Line label="Endereço" value={c.endereco || "—"} />
              </Section>
              <Section title="Vínculo">
                <Line label="Paróquia" value={paroquia?.nome ?? "—"} />
                <Line label="Comunidade" value={comunidade?.nome ?? "—"} />
                <Line label="Catequista" value={catequista?.nome ?? "—"} />
              </Section>
              <Section title="Sacramentos Recebidos">
                {loadingSac ? (
                  <p className="text-xs text-[#94a3b8]">Carregando...</p>
                ) : sacramentos.length === 0 ? (
                  <p className="text-xs text-[#94a3b8]">Nenhum sacramento registrado.</p>
                ) : (
                  <div className="space-y-3">
                    {sacramentos.map((s) => {
                      const label = s.tipo === "batismo" ? "Batismo" : s.tipo === "primeira_eucaristia" ? "1ª Eucaristia" : s.tipo === "crisma" ? "Crisma" : s.tipo;
                      return (
                        <div key={s.id} className="border border-[#e2e8f0] rounded-[6px] p-3 bg-[#f8fafc]">
                          <div className="flex items-center justify-between mb-1.5 border-b border-[#e2e8f0] pb-1">
                            <span className="text-xs font-semibold text-[#1e40af] uppercase tracking-wider">{label}</span>
                            {s.data_recebimento && <span className="text-xs text-[#64748b]">{formatDate(s.data_recebimento)}</span>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#374151]">
                            {s.paroquia_local && <div><strong>Local:</strong> {s.paroquia_local}</div>}
                            {s.celebrante && <div><strong>Celebrante:</strong> {s.celebrante}</div>}
                            {s.padrinhos && <div className="col-span-2 mt-0.5"><strong>Padrinhos:</strong> {s.padrinhos}</div>}
                            {s.observacoes && <div className="col-span-2 text-[#64748b] italic mt-0.5">Obs: {s.observacoes}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
              <Section title="Documentos">
                <Line
                  label="Certidão / RG do menor"
                  value={c.documento_certidao_url ? (
                    <a className="inline-flex items-center gap-1 text-[#2563eb] hover:underline" href={c.documento_certidao_url} target="_blank" rel="noreferrer">
                      <Eye size={14} /> Ver arquivo
                    </a>
                  ) : (
                    <span className="text-sm text-[#64748b]">Nenhum anexo</span>
                  )}
                />
                <Line
                  label="Certidão de Batismo"
                  value={c.documento_batismo_url ? (
                    <a className="inline-flex items-center gap-1 text-[#2563eb] hover:underline" href={c.documento_batismo_url} target="_blank" rel="noreferrer">
                      <Eye size={14} /> Ver arquivo
                    </a>
                  ) : (
                    <span className="text-sm text-[#64748b]">Nenhum anexo</span>
                  )}
                />
                <Line
                  label="Laudo médico"
                  value={c.documento_laudo_url ? (
                    <a className="inline-flex items-center gap-1 text-[#2563eb] hover:underline" href={c.documento_laudo_url} target="_blank" rel="noreferrer">
                      <Eye size={14} /> Ver arquivo
                    </a>
                  ) : (
                    <span className="text-sm text-[#64748b]">Nenhum anexo</span>
                  )}
                />
                <Line
                  label="RG / CNH do responsável"
                  value={c.documento_responsavel_url ? (
                    <a className="inline-flex items-center gap-1 text-[#2563eb] hover:underline" href={c.documento_responsavel_url} target="_blank" rel="noreferrer">
                      <Eye size={14} /> Ver arquivo
                    </a>
                  ) : (
                    <span className="text-sm text-[#64748b]">Nenhum anexo</span>
                  )}
                />
                <Line
                  label="Termo de autorização"
                  value={c.documento_autorizacao_url ? (
                    <a className="inline-flex items-center gap-1 text-[#2563eb] hover:underline" href={c.documento_autorizacao_url} target="_blank" rel="noreferrer">
                      <Eye size={14} /> Ver arquivo
                    </a>
                  ) : (
                    <span className="text-sm text-[#64748b]">Nenhum anexo</span>
                  )}
                />
              </Section>
            </div>
          </div>
        </Card>
      </div>
      <Outlet />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-xs uppercase tracking-[0.05em] text-[#64748b]">{label}</div>
      <div className="col-span-2 text-sm text-[#0f172a]">{value}</div>
    </div>
  );
}
function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
