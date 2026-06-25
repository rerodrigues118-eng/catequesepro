import { createFileRoute } from "@tanstack/react-router";
import { Users, MapPin, UserCheck, BarChart2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, nivelLabel, type Nivel } from "@/lib/db";
import { Card, PageHeader, Select, Badge, SectionLabel } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CatequesePRO" }] }),
  component: Dashboard,
});

function Metric({ icon, label, value, hint, color }: { icon: React.ReactNode; label: string; value: number | string; hint: string; color: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-[#374151]">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="mt-3 text-[30px] font-bold text-[#0f172a] leading-none">{value}</div>
      <div className="mt-2 text-xs text-[#64748b]">{hint}</div>
    </Card>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { db } = useDb();
  const isAdmin = user?.role === "admin";

  const [comunidadeFilter, setComunidadeFilter] = useState<string>("all");

  const scopedCatequizandos = useMemo(() => {
    let list = db.catequizandos;
    if (!isAdmin && user?.catequista_id) list = list.filter((c) => c.catequista_id === user.catequista_id);
    if (isAdmin && comunidadeFilter !== "all") list = list.filter((c) => c.comunidade_id === comunidadeFilter);
    return list;
  }, [db.catequizandos, isAdmin, user, comunidadeFilter]);

  const scopedCatequistas = useMemo(() => {
    if (!isAdmin && user?.catequista_id) return db.catequistas.filter((c) => c.id === user.catequista_id);
    if (isAdmin && comunidadeFilter !== "all") return db.catequistas.filter((c) => c.comunidade_id === comunidadeFilter);
    return db.catequistas;
  }, [db.catequistas, isAdmin, user, comunidadeFilter]);

  const scopedComunidades = useMemo(() => {
    if (!isAdmin && user?.catequista_id) {
      const me = db.catequistas.find((c) => c.id === user.catequista_id);
      return me ? db.comunidades.filter((c) => c.id === me.comunidade_id) : [];
    }
    if (isAdmin && comunidadeFilter !== "all") return db.comunidades.filter((c) => c.id === comunidadeFilter);
    return db.comunidades;
  }, [db.comunidades, db.catequistas, isAdmin, user, comunidadeFilter]);

  const media = scopedCatequistas.length
    ? (scopedCatequizandos.length / scopedCatequistas.length).toFixed(1)
    : "0";

  const paroquiaNome = db.paroquias[0]?.nome ?? "—";
  const total = scopedCatequizandos.length;

  // Por comunidade
  const porComunidade = scopedComunidades.map((com) => {
    const alunos = scopedCatequizandos.filter((c) => c.comunidade_id === com.id).length;
    const cats = scopedCatequistas.filter((c) => c.comunidade_id === com.id).length;
    return { id: com.id, nome: com.nome, alunos, cats, pct: total > 0 ? (alunos / total) * 100 : 0 };
  });

  // Por catequista
  const porCatequista = scopedCatequistas.map((cat) => {
    const alunos = scopedCatequizandos.filter((c) => c.catequista_id === cat.id);
    const com = db.comunidades.find((c) => c.id === cat.comunidade_id);
    const niveis: Record<Nivel, number> = { iniciacao: 0, primeira_eucaristia: 0, crisma: 0 };
    alunos.forEach((a) => (niveis[a.nivel] = (niveis[a.nivel] || 0) + 1));
    return { id: cat.id, nome: cat.nome, comunidade: com?.nome ?? "—", total: alunos.length, niveis };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={paroquiaNome}
        right={
          isAdmin ? (
            <div style={{ minWidth: 200 }}>
              <Select value={comunidadeFilter} onChange={(e) => setComunidadeFilter(e.target.value)}>
                <option value="all">Todas as comunidades</option>
                {db.comunidades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric icon={<Users size={18} />} color="#1e40af" label="Catequizandos" value={scopedCatequizandos.length} hint="no total" />
        <Metric icon={<MapPin size={18} />} color="#d97706" label="Comunidades" value={scopedComunidades.length} hint="ativas" />
        <Metric icon={<UserCheck size={18} />} color="#15803d" label="Catequistas" value={scopedCatequistas.length} hint="no total" />
        <Metric icon={<BarChart2 size={18} />} color="#64748b" label="Média / catequista" value={media} hint="catequizandos" />
      </div>

      {/* Por comunidade */}
      <div className="mt-6">
        <Card>
          <SectionLabel>Por comunidade</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <Th>Comunidade</Th>
                  <Th>Catequistas</Th>
                  <Th>Catequizandos</Th>
                  <Th className="min-w-[160px]">Distribuição</Th>
                </tr>
              </thead>
              <tbody>
                {porComunidade.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-[#64748b]">
                      Sem dados.
                    </td>
                  </tr>
                )}
                {porComunidade.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f8fafc]" style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <Td>{c.nome}</Td>
                    <Td>{c.cats}</Td>
                    <Td>{c.alunos}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#e2e8f0" }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${c.pct}%`, backgroundColor: "#1e40af" }} />
                        </div>
                        <span className="text-xs text-[#64748b] w-10 text-right">{c.pct.toFixed(0)}%</span>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Por catequista */}
      <div className="mt-6">
        <Card>
          <SectionLabel>Por catequista</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <Th>Catequista</Th>
                  <Th>Comunidade</Th>
                  <Th>Catequizandos</Th>
                  <Th>Por nível</Th>
                  <Th>Situação</Th>
                </tr>
              </thead>
              <tbody>
                {porCatequista.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-[#64748b]">
                      Sem dados.
                    </td>
                  </tr>
                )}
                {porCatequista.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f8fafc]" style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <Td>{c.nome}</Td>
                    <Td>{c.comunidade}</Td>
                    <Td>{c.total}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(["iniciacao", "primeira_eucaristia", "crisma"] as Nivel[]).map((n) => (
                          <Badge key={n} tone="cinza">
                            {nivelLabel(n)}: {c.niveis[n]}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      {c.total > 12 ? <Badge tone="ambar">acima da média</Badge> : <Badge tone="verde">regular</Badge>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-4 py-2 text-xs uppercase tracking-[0.05em] text-[#64748b] font-medium ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-[#374151]">{children}</td>;
}
