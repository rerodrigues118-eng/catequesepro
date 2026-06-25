import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDb, calcIdade, nivelLabel } from "@/lib/db";
import { Avatar, Badge, Button, Card, SectionLabel } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/catequizandos/$id")({
  head: () => ({ meta: [{ title: "Ficha — CatequesePRO" }] }),
  component: FichaPage,
});

function FichaPage() {
  const { id } = Route.useParams();
  const { db } = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const c = db.catequizandos.find((x) => x.id === id);
  if (!c) return <Navigate to="/catequizandos" replace />;

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
          {isAdmin && (
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
                style={{ aspectRatio: "3/4", border: "1px solid #e2e8f0", borderRadius: 8 }}
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
            </div>
          </div>
        </Card>
      </div>
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
function Line({ label, value }: { label: string; value: string }) {
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
