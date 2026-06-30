import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { Badge, Button, Card, Field, Input, PageHeader, Select } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — CatequesePRO" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { profile } = useAuth();
  const { db, inviteCatequista, deleteInvite, deleteCatequista, updateIAAccess } = useDb();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [comunidadeId, setComunidadeId] = useState("");
  const [inviteRole, setInviteRole] = useState<"catequista" | "coordenacao">("catequista");
  const [err, setErr] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{ inviteLink: string; emailStatus: string; emailError: string | null } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!nome.trim() || !email.trim() || !comunidadeId) {
      setErr("Preencha todos os campos.");
      return;
    }
    if (db.catequistas.some((c) => c.email?.toLowerCase() === email.trim().toLowerCase())) {
      setErr("Já existe um usuário com este email.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await inviteCatequista({ nome: nome.trim(), email: email.trim(), comunidade_id: comunidadeId, role: inviteRole });
      setLastInvite({
        inviteLink: result.inviteLink,
        emailStatus: result.emailStatus,
        emailError: result.emailError,
      });
      setNome("");
      setEmail("");
      setComunidadeId("");
      setOpen(false);
    } catch (err) {
      setErr((err as Error).message ?? "Falha ao convidar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvite = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja cancelar o convite enviado para ${name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsDeleting(id);
    setPageError(null);
    try {
      await deleteInvite(id);
    } catch (error) {
      setPageError((error as Error).message ?? "Falha ao cancelar o convite.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteCatequista = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja remover o acesso e excluir o catequista ${name} do sistema? Esta ação irá remover a conta de login e limpar as referências dele em atividades e catequizandos.`)) {
      return;
    }

    setIsDeleting(id);
    setPageError(null);
    try {
      await deleteCatequista(id);
    } catch (error) {
      setPageError((error as Error).message ?? "Falha ao excluir o acesso do catequista.");
    } finally {
      setIsDeleting(null);
    }
  };

  if (profile && profile.role !== "admin" && profile.role !== "coordenacao") return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie catequistas com acesso ao sistema"
        right={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setInviteRole("catequista"); setOpen(true); }}>
              <Plus size={16} /> Convidar catequista
            </Button>
            <Button
              onClick={() => { setInviteRole("coordenacao"); setOpen(true); }}
              style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed", color: "#ffffff" }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#6d28d9"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#7c3aed"; }}
            >
              <Plus size={16} /> Convidar coordenador
            </Button>
          </div>
        }
      />

      {pageError && (
        <div className="mb-6 text-sm px-4 py-3 rounded-[8px] flex items-center justify-between" style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}>
          <span>{pageError}</span>
          <button onClick={() => setPageError(null)} className="text-xs font-semibold underline hover:text-[#b91c1c] ml-2">Fechar</button>
        </div>
      )}

      {lastInvite && (
        <Card className="mb-6">
          <div className="px-4 py-4 space-y-2">
            <p className="text-sm font-semibold text-[#0f172a]">
              {lastInvite.emailStatus === "sent"
                ? "Convite criado e e-mail enviado."
                : "Convite criado, mas o e-mail não foi enviado. Compartilhe o link abaixo manualmente."}
            </p>
            <a href={lastInvite.inviteLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 break-all">
              {lastInvite.inviteLink}
            </a>
            {lastInvite.emailError && <p className="text-xs text-[#64748b]">{lastInvite.emailError}</p>}
          </div>
        </Card>
      )}

      {/* Convites pendentes */}
      {db.catequistas.filter((c) => c.status === "pending").length > 0 && (
        <Card className="mb-6">
          <h3 className="text-sm font-semibold px-4 pt-4">Convites pendentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <Th>Nome</Th>
                  <Th className="hidden sm:table-cell">E-mail</Th>
                  <Th className="hidden sm:table-cell">Comunidade</Th>
                  <Th>Função</Th>
                  <Th className="hidden md:table-cell">Criado em</Th>
                  <Th>Status</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {db.catequistas
                  .filter((c) => c.status === "pending")
                  .map((cat) => {
                    const com = db.comunidades.find((x) => x.id === cat.comunidade_id) ?? null;
                    const invite = db.convites?.find((x) => x.catequista_id === cat.id);
                    const isCoord = invite?.role === "coordenacao";
                    return (
                      <tr key={cat.id} className="hover:bg-[#f8fafc]" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>
                          <span className="block font-medium text-[#0f172a]">{cat.nome}</span>
                          <span className="sm:hidden text-xs text-[#64748b] truncate block max-w-[140px]">{cat.email ?? "—"}</span>
                        </Td>
                        <Td className="hidden sm:table-cell">
                          <span className="truncate block max-w-[180px]">{cat.email ?? "—"}</span>
                        </Td>
                        <Td className="hidden sm:table-cell">{com?.nome ?? "—"}</Td>
                        <Td>
                          <Badge tone={isCoord ? "ambar" : "azul"}>
                            {isCoord ? "Coordenador" : "Catequista"}
                          </Badge>
                        </Td>
                        <Td className="hidden md:table-cell">{cat.created_at ? new Date(cat.created_at).toLocaleDateString("pt-BR") : "—"}</Td>
                        <Td>
                          <Badge tone="amarelo">Em análise</Badge>
                        </Td>
                        <Td>
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteInvite(cat.id, cat.nome)}
                            disabled={isDeleting !== null}
                            className="px-2 py-1 text-xs"
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline ml-1">{isDeleting === cat.id ? "Cancelando..." : "Cancelar"}</span>
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Catequistas ativos */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <Th>Nome</Th>
                <Th className="hidden sm:table-cell">E-mail</Th>
                <Th className="hidden sm:table-cell">Comunidade</Th>
                <Th>Função</Th>
                <Th className="hidden md:table-cell">Criado em</Th>
                <Th>Status</Th>
                <Th>Acesso IA</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {db.catequistas
                .filter((c) => c.status !== "pending")
                .map((cat) => {
                  const com = db.comunidades.find((x) => x.id === cat.comunidade_id) ?? null;
                  const userProfile = db.usuarios.find((u) => u.catequista_id === cat.id);
                  const isCoord = userProfile?.role === "coordenacao";
                  const isAdminUser = userProfile?.role === "admin";
                  return (
                    <tr key={cat.id} className="hover:bg-[#f8fafc]" style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <Td>
                        <span className="block font-medium text-[#0f172a]">{cat.nome}</span>
                        <span className="sm:hidden text-xs text-[#64748b] truncate block max-w-[140px]">{cat.email ?? "Sem login"}</span>
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <span className="truncate block max-w-[180px]">{cat.email ?? "—"}</span>
                      </Td>
                      <Td className="hidden sm:table-cell">{com?.nome ?? "—"}</Td>
                      <Td>
                        <Badge tone={isAdminUser ? "verde" : isCoord ? "ambar" : "azul"}>
                          {isAdminUser ? "Administrador" : isCoord ? "Coordenador" : "Catequista"}
                        </Badge>
                      </Td>
                      <Td className="hidden md:table-cell">{cat.created_at ? new Date(cat.created_at).toLocaleDateString("pt-BR") : "—"}</Td>
                      <Td>
                        {cat.email ? <Badge tone="verde">Ativo</Badge> : <Badge tone="cinza">Sem login</Badge>}
                      </Td>
                      <Td>
                        {isAdminUser || isCoord ? (
                          <span className="text-xs text-[#64748b]">Sempre ativo</span>
                        ) : userProfile ? (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!userProfile.permitir_ia}
                              onChange={async (e) => {
                                try {
                                  await updateIAAccess(userProfile.id, e.target.checked);
                                } catch (error) {
                                  setPageError((error as Error).message ?? "Falha ao atualizar permissão.");
                                }
                              }}
                              className="w-4 h-4 accent-[#1e40af]"
                            />
                            <span className="text-xs text-[#374151]">Permitir</span>
                          </label>
                        ) : (
                          <span className="text-xs text-[#94a3b8]">Sem login</span>
                        )}
                      </Td>
                      <Td>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteCatequista(cat.id, cat.nome)}
                          disabled={isDeleting !== null}
                          className="px-2 py-1 text-xs"
                        >
                          <Trash2 size={14} />
                          <span className="hidden sm:inline ml-1">{isDeleting === cat.id ? "Excluindo..." : "Excluir"}</span>
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
          <div className="bg-white rounded-[10px] p-5 w-full max-w-md" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
            <h3 className="text-base font-semibold text-[#0f172a] mb-4">
              {inviteRole === "coordenacao" ? "Convidar coordenador" : "Convidar catequista"}
            </h3>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Nome" required>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Comunidade" required>
                <Select value={comunidadeId} onChange={(e) => setComunidadeId(e.target.value)}>
                  <option value="">Selecione</option>
                  {db.comunidades.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              {err && (
                <div className="text-xs px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                  {err}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando..." : "Convidar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-2 text-xs uppercase tracking-[0.05em] text-[#64748b] font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-[#374151] ${className ?? ""}`}>{children}</td>;
}
