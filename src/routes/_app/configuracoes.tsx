import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, Field, Input, PageHeader, SectionLabel, Select } from "@/components/ui-lite";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — CatequesePRO" }] }),
  component: ConfiguracoesPage,
});

type Configuracao = {
  id: string;
  paroquia_id: string;
  paroquias?: { nome: string };
  max_faltas: number;
  idade_min_iniciacao: number;
  idade_min_primeira_comunhao: number;
  idade_min_crisma: number;
  notificacao_ativa_faltas: boolean;
  notificacao_ativa_idade: boolean;
  template_email_faltas_subject: string;
  template_email_faltas_body: string;
  template_email_idade_subject: string;
  template_email_idade_body: string;
  updated_at: string;
};

function ConfiguracoesPage() {
  const { profile, isLoading } = useAuth();
  const { db, isLoading: dbLoading, inviteCatequista } = useDb();
  const [configs, setConfigs] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creatingConfig, setCreatingConfig] = useState(false);
  const [newConfigParoquiaId, setNewConfigParoquiaId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Coordinator invite modal state
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteRole] = useState<"coordenacao" | "catequista">("coordenacao");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteComunidadeId, setInviteComunidadeId] = useState("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteErr(null);
    if (!inviteNome.trim() || !inviteEmail.trim() || !inviteComunidadeId) {
      setInviteErr("Preencha todos os campos.");
      return;
    }
    setSubmittingInvite(true);
    try {
      await inviteCatequista({
        nome: inviteNome.trim(),
        email: inviteEmail.trim(),
        comunidade_id: inviteComunidadeId,
        role: inviteRole,
      });
      setOpenInvite(false);
      setInviteNome("");
      setInviteEmail("");
      setInviteComunidadeId("");
    } catch (err) {
      setInviteErr((err as Error).message ?? "Falha ao convidar.");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const missingParoquias = db.paroquias.filter(
    (paroquia) => !configs.some((config) => config.paroquia_id === paroquia.id),
  );

  useEffect(() => {
    if (missingParoquias.length > 0 && !newConfigParoquiaId) {
      setNewConfigParoquiaId(missingParoquias[0].id);
    }
  }, [missingParoquias, newConfigParoquiaId]);

  useEffect(() => {
    if (isLoading || dbLoading) return;
    if (profile?.role !== "admin") return;
    void fetchConfigs();
  }, [profile, isLoading, dbLoading]);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from<Configuracao>("configuracoes_notificacao")
      .select("*, paroquias(nome)")
      .order("updated_at", { ascending: false });

    if (error) {
      setError(error.message);
      setConfigs([]);
    } else {
      setConfigs(data ?? []);
    }
    setLoading(false);
  };

  const updateConfig = (id: string, key: keyof Configuracao, value: any) => {
    setConfigs((items) => items.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const saveConfig = async (config: Configuracao) => {
    setSavingId(config.id);
    setError(null);
    const { data, error } = await supabase
      .from<Configuracao>("configuracoes_notificacao")
      .update({
        max_faltas: config.max_faltas,
        idade_min_iniciacao: config.idade_min_iniciacao,
        idade_min_primeira_comunhao: config.idade_min_primeira_comunhao,
        idade_min_crisma: config.idade_min_crisma,
        notificacao_ativa_faltas: config.notificacao_ativa_faltas,
        notificacao_ativa_idade: config.notificacao_ativa_idade,
        template_email_faltas_subject: config.template_email_faltas_subject,
        template_email_faltas_body: config.template_email_faltas_body,
        template_email_idade_subject: config.template_email_idade_subject,
        template_email_idade_body: config.template_email_idade_body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id)
      .select("*, paroquias(nome)")
      .maybeSingle();

    if (error) {
      setError(error.message);
    } else if (data) {
      setConfigs((items) => items.map((item) => (item.id === data.id ? data : item)));
    }
    setSavingId(null);
  };

  const createConfig = async () => {
    if (!newConfigParoquiaId) return;
    setCreatingConfig(true);
    setError(null);

    const { data, error } = await supabase
      .from<Configuracao>("configuracoes_notificacao")
      .insert({
        paroquia_id: newConfigParoquiaId,
        max_faltas: 3,
        idade_min_iniciacao: 7,
        idade_min_primeira_comunhao: 9,
        idade_min_crisma: 14,
        notificacao_ativa_faltas: true,
        notificacao_ativa_idade: true,
        template_email_faltas_subject: "Aviso de faltas — {nome}",
        template_email_faltas_body: `Olá {nome_responsavel},\n\n{nome} acumulou {total_faltas} faltas no mês, atingindo o limite de {max_faltas}.\n\nAtenciosamente,\n{paroquia}`,
        template_email_idade_subject: "Aviso de idade — {nome}",
        template_email_idade_body: `Olá {nome_responsavel},\n\n{nome} está abaixo da idade mínima de {idade_minima} anos para o nível {nivel}.\nIdade atual: {idade_atual}.\n\nAtenciosamente,\n{paroquia}`,
        updated_at: new Date().toISOString(),
      })
      .select("*, paroquias(nome)")
      .maybeSingle();

    if (error) {
      setError(error.message);
    } else if (data) {
      setConfigs((items) => [data, ...items]);
      const nextParoquia = missingParoquias.find((p) => p.id !== newConfigParoquiaId);
      setNewConfigParoquiaId(nextParoquia?.id ?? "");
    }

    setCreatingConfig(false);
  };

  if (isLoading) {
    return <div className="text-[#94a3b8]">Carregando...</div>;
  }
  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Ajuste regras de notificação" />

      {error && (
        <div className="mb-6 text-sm px-4 py-3 rounded-[8px]" style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-semibold underline hover:text-[#b91c1c] ml-2">Fechar</button>
        </div>
      )}

      {loading ? (
        <Card>
          <p className="text-sm text-[#64748b]">Buscando configurações...</p>
        </Card>
      ) : (
        <>
          {missingParoquias.length > 0 && (
            <Card className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Field label="Paróquia" required>
                  <Select
                    value={newConfigParoquiaId}
                    onChange={(e) => setNewConfigParoquiaId(e.target.value)}
                  >
                    {missingParoquias.map((paroquia) => (
                      <option key={paroquia.id} value={paroquia.id}>
                        {paroquia.nome}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="md:col-span-2 flex items-center gap-2">
                  <Button onClick={createConfig} disabled={creatingConfig || !newConfigParoquiaId}>
                    {creatingConfig ? "Criando..." : "Criar configuração"}
                  </Button>
                  <span className="text-xs text-[#64748b]">Crie configurações para as paróquias que ainda não possuem.</span>
                </div>
              </div>
            </Card>
          )}

          {configs.length === 0 ? (
            <Card>
              <p className="text-sm text-[#64748b]">Nenhuma configuração encontrada. Crie uma configuração no banco de dados para começar.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <Card key={config.id}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#0f172a]">{config.paroquias?.nome ?? "Paróquia"}</h3>
                      <p className="text-xs text-[#64748b]">Atualizado em {new Date(config.updated_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <Badge tone={config.notificacao_ativa_faltas || config.notificacao_ativa_idade ? "verde" : "cinza"}>
                      {config.notificacao_ativa_faltas || config.notificacao_ativa_idade ? "Ativo" : "Desativado"}
                    </Badge>
                  </div>

                  <SectionLabel>Limites e idades</SectionLabel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Field label="Máximo de faltas" required>
                      <Input
                        type="number"
                        value={config.max_faltas}
                        onChange={(e) => updateConfig(config.id, "max_faltas", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Idade mínima - Iniciação" required>
                      <Input
                        type="number"
                        value={config.idade_min_iniciacao}
                        onChange={(e) => updateConfig(config.id, "idade_min_iniciacao", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Idade mínima - 1ª Eucaristia" required>
                      <Input
                        type="number"
                        value={config.idade_min_primeira_comunhao}
                        onChange={(e) => updateConfig(config.id, "idade_min_primeira_comunhao", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Idade mínima - Crisma" required>
                      <Input
                        type="number"
                        value={config.idade_min_crisma}
                        onChange={(e) => updateConfig(config.id, "idade_min_crisma", Number(e.target.value))}
                      />
                    </Field>
                  </div>

                  <SectionLabel>Notificações</SectionLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Field label="Notificar falta" hint="Enviar aviso quando atingir o limite">
                      <Select
                        value={String(config.notificacao_ativa_faltas)}
                        onChange={(e) => updateConfig(config.id, "notificacao_ativa_faltas", e.target.value === "true")}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Desativado</option>
                      </Select>
                    </Field>
                    <Field label="Notificar idade" hint="Enviar aviso quando novo aluno está fora da faixa etária">
                      <Select
                        value={String(config.notificacao_ativa_idade)}
                        onChange={(e) => updateConfig(config.id, "notificacao_ativa_idade", e.target.value === "true")}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Desativado</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => void saveConfig(config)}
                      disabled={savingId === config.id}
                    >
                      {savingId === config.id ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
