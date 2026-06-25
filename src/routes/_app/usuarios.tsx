import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { Badge, Button, Card, Field, Input, PageHeader, Select } from "@/components/ui-lite";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — CatequesePRO" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  const { db, inviteCatequista } = useDb();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [comunidadeId, setComunidadeId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!nome.trim() || !email.trim() || !comunidadeId) {
      setErr("Preencha todos os campos.");
      return;
    }
    if (db.usuarios.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setErr("Já existe um usuário com este email.");
      return;
    }
    inviteCatequista({ nome: nome.trim(), email: email.trim(), comunidade_id: comunidadeId });
    setNome("");
    setEmail("");
    setComunidadeId("");
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie catequistas com acesso ao sistema"
        right={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Convidar catequista
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <Th>Nome</Th>
                <Th>Email</Th>
                <Th>Comunidade</Th>
                <Th>Criado em</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.usuarios
                .filter((u) => u.role === "catequista")
                .map((u) => {
                  const cat = db.catequistas.find((c) => c.id === u.catequista_id);
                  const com = cat ? db.comunidades.find((c) => c.id === cat.comunidade_id) : null;
                  return (
                    <tr key={u.id} className="hover:bg-[#f8fafc]" style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <Td>{u.nome}</Td>
                      <Td>{u.email}</Td>
                      <Td>{com?.nome ?? "—"}</Td>
                      <Td>{new Date(u.created_at).toLocaleDateString("pt-BR")}</Td>
                      <Td>
                        {u.status === "ativo" ? <Badge tone="verde">Ativo</Badge> : <Badge tone="cinza">Sem login</Badge>}
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
            <h3 className="text-base font-semibold text-[#0f172a] mb-4">Convidar catequista</h3>
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
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Convidar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2 text-xs uppercase tracking-[0.05em] text-[#64748b] font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-[#374151]">{children}</td>;
}
