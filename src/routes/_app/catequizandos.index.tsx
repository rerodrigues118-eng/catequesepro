import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Eye, Pencil, Trash2, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, calcIdade, nivelLabel } from "@/lib/db";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/catequizandos/")({
  head: () => ({ meta: [{ title: "Catequizandos — CatequesePRO" }] }),
  component: ListPage,
});

const PAGE_SIZE = 20;

function ListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { db, deleteCatequizando } = useDb();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [comunidadeId, setComunidadeId] = useState("all");
  const [catequistaId, setCatequistaId] = useState("all");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<{ id: string; nome: string } | null>(null);

  const filtered = useMemo(() => {
    let list = db.catequizandos;
    if (!isAdmin && user?.catequista_id) list = list.filter((c) => c.catequista_id === user.catequista_id);
    if (isAdmin) {
      if (comunidadeId !== "all") list = list.filter((c) => c.comunidade_id === comunidadeId);
      if (catequistaId !== "all") list = list.filter((c) => c.catequista_id === catequistaId);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.nome.toLowerCase().includes(q));
    }
    return list;
  }, [db.catequizandos, isAdmin, user, comunidadeId, catequistaId, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setComunidadeId("all");
    setCatequistaId("all");
    setPage(1);
  };

  const filteredCatequistas = isAdmin
    ? comunidadeId === "all"
      ? db.catequistas
      : db.catequistas.filter((c) => c.comunidade_id === comunidadeId)
    : [];

  return (
    <div>
      <PageHeader
        title="Catequizandos"
        badge={<Badge tone="azul">{filtered.length}</Badge>}
        right={
          <Link to="/catequizandos/novo">
            <Button>
              <Plus size={16} />
              Novo cadastro
            </Button>
          </Link>
        }
      />

      {isAdmin && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">Buscar</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Comunidade</label>
              <Select
                value={comunidadeId}
                onChange={(e) => {
                  setComunidadeId(e.target.value);
                  setCatequistaId("all");
                  setPage(1);
                }}
              >
                <option value="all">Todas</option>
                {db.comunidades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Catequista</label>
              <Select
                value={catequistaId}
                onChange={(e) => {
                  setCatequistaId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Todos</option>
                {filteredCatequistas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-4">
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={64} />}
            title="Nenhum catequizando encontrado"
            subtitle="Clique em Novo cadastro para começar"
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <Th>Foto</Th>
                    <Th>Nome</Th>
                    <Th>Comunidade</Th>
                    <Th>Catequista</Th>
                    <Th>Nível</Th>
                    <Th>Nascimento</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => {
                    const com = db.comunidades.find((x) => x.id === c.comunidade_id);
                    const cat = db.catequistas.find((x) => x.id === c.catequista_id);
                    return (
                      <tr key={c.id} className="hover:bg-[#f8fafc]" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>
                          <Avatar src={c.foto_url} nome={c.nome} />
                        </Td>
                        <Td>
                          <span className="font-medium text-[#0f172a]">{c.nome}</span>
                          <div className="text-xs text-[#64748b]">{calcIdade(c.data_nascimento)} anos</div>
                        </Td>
                        <Td>{com?.nome ?? "—"}</Td>
                        <Td>{cat?.nome ?? "—"}</Td>
                        <Td>
                          <Badge tone="cinza">{nivelLabel(c.nivel)}</Badge>
                        </Td>
                        <Td>{formatDate(c.data_nascimento)}</Td>
                        <Td>
                          <div className="flex items-center justify-end gap-1">
                            <IconBtn title="Ver" onClick={() => navigate({ to: "/catequizandos/$id", params: { id: c.id } })}>
                              <Eye size={16} />
                            </IconBtn>
                            <IconBtn title="Editar" onClick={() => navigate({ to: "/catequizandos/$id/editar", params: { id: c.id } })}>
                              <Pencil size={16} />
                            </IconBtn>
                            {isAdmin && (
                              <IconBtn title="Excluir" danger onClick={() => setToDelete({ id: c.id, nome: c.nome })}>
                                <Trash2 size={16} />
                              </IconBtn>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {pageItems.map((c) => {
                const com = db.comunidades.find((x) => x.id === c.comunidade_id);
                const cat = db.catequistas.find((x) => x.id === c.catequista_id);
                return (
                  <div key={c.id} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <Avatar src={c.foto_url} nome={c.nome} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#0f172a] truncate">{c.nome}</div>
                      <div className="text-xs text-[#64748b] truncate">
                        {com?.nome} · {cat?.nome}
                      </div>
                      <div className="mt-1">
                        <Badge tone="cinza">{nivelLabel(c.nivel)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconBtn title="Ver" onClick={() => navigate({ to: "/catequizandos/$id", params: { id: c.id } })}>
                        <Eye size={16} />
                      </IconBtn>
                      <IconBtn title="Editar" onClick={() => navigate({ to: "/catequizandos/$id/editar", params: { id: c.id } })}>
                        <Pencil size={16} />
                      </IconBtn>
                      {isAdmin && (
                        <IconBtn title="Excluir" danger onClick={() => setToDelete({ id: c.id, nome: c.nome })}>
                          <Trash2 size={16} />
                        </IconBtn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-xs text-[#64748b]">
              <span>
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir catequizando"
        description={toDelete ? `Deseja excluir ${toDelete.nome}? Esta ação não pode ser desfeita.` : ""}
        confirmLabel="Excluir"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteCatequizando(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-2 text-xs uppercase tracking-[0.05em] text-[#64748b] font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-[#374151] align-middle">{children}</td>;
}
function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-[6px] transition-colors duration-100 hover:bg-[#f1f5f9]"
      style={{ color: danger ? "#dc2626" : "#64748b" }}
    >
      {children}
    </button>
  );
}
function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
