import { createFileRoute, Navigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  SectionLabel,
  Textarea,
} from "@/components/ui-lite";

export const Route = createFileRoute("/_app/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — CatequesePRO" }] }),
  component: NotificacoesPage,
});

type NotificacaoLog = {
  id: string;
  catequizando_id: string;
  tipo: "faltas" | "idade";
  enviado_para: string;
  enviado_em: string;
  detalhes: Record<string, unknown> | null;
  catequizandos?: { nome: string };
};

type Configuracao = {
  id: string;
  paroquia_id: string;
  paroquias?: { nome: string };
  template_email_faltas_subject: string;
  template_email_faltas_body: string;
  template_email_idade_subject: string;
  template_email_idade_body: string;
};

function NotificacoesPage() {
  const { profile, session, isLoading } = useAuth();
  const [logs, setLogs] = useState<NotificacaoLog[]>([]);
  const [configs, setConfigs] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"faltas" | "idade">("faltas");
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingBody, setSavingBody] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (profile?.role !== "admin" && profile?.role !== "coordenacao") return;
    void fetchLogs();
    void fetchConfigs();
  }, [profile, isLoading]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from<NotificacaoLog>("notificacoes_log")
      .select("*, catequizandos(nome)")
      .order("enviado_em", { ascending: false });

    if (error) {
      setError(error.message);
      setLogs([]);
    } else {
      setLogs(data ?? []);
    }
    setLoading(false);
  };

  const fetchConfigs = async () => {
    setConfigLoading(true);
    const { data, error } = await supabase
      .from<Configuracao>("configuracoes_notificacao")
      .select(
        "id, paroquia_id, paroquias(nome), template_email_faltas_subject, template_email_faltas_body, template_email_idade_subject, template_email_idade_body",
      );

    if (error) {
      console.error(error);
      setConfigs([]);
    } else {
      setConfigs(data ?? []);
      if (data && data.length > 0 && !selectedType) {
        setSelectedType(data[0].id ? "faltas" : "idade");
      }
    }
    setConfigLoading(false);
  };

  const resendNotification = async (id: string) => {
    setResendingId(id);
    setError(null);

    const response = await fetch("/api/-reenvio-notificacao", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ notificacao_id: id }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Falha ao reenviar notificação.");
    } else {
      await fetchLogs();
    }
    setResendingId(null);
  };

  const currentConfig = configs[0];
  const emailSubject =
    selectedType === "faltas"
      ? (currentConfig?.template_email_faltas_subject ?? "")
      : (currentConfig?.template_email_idade_subject ?? "");
  const emailBody =
    selectedType === "faltas"
      ? (currentConfig?.template_email_faltas_body ?? "")
      : (currentConfig?.template_email_idade_body ?? "");

  const startEditingBody = () => {
    setEditSubject(emailSubject ?? "");
    setEditBody(emailBody ?? "");
    setIsEditingBody(true);
  };

  const editTemplate = (type: "faltas" | "idade") => {
    setSelectedType(type);
    setEditSubject(
      type === "faltas"
        ? (currentConfig?.template_email_faltas_subject ?? "")
        : (currentConfig?.template_email_idade_subject ?? ""),
    );
    setEditBody(
      type === "faltas"
        ? (currentConfig?.template_email_faltas_body ?? "")
        : (currentConfig?.template_email_idade_body ?? ""),
    );
    setIsEditingBody(true);
  };

  const saveBody = async () => {
    if (!currentConfig) return;
    // Validate placeholders for body and subject
    const requiredPlaceholders = ["{nome_responsavel}", "{nome}"];
    const missingBody = requiredPlaceholders.filter((ph) => !editBody.includes(ph));
    if (missingBody.length > 0) {
      setError(`O corpo do e‑mail deve conter os placeholders: ${missingBody.join(", ")}`);
      setSavingBody(false);
      return;
    }
    const missingSubject = requiredPlaceholders.filter((ph) => !editSubject.includes(ph));
    if (missingSubject.length > 0) {
      setError(`O assunto do e‑mail deve conter os placeholders: ${missingSubject.join(", ")}`);
      setSavingBody(false);
      return;
    }
    setSavingBody(true);
    const updatePayload: Partial<Configuracao> = {
      template_email_faltas_body: currentConfig.template_email_faltas_body,
      template_email_idade_body: currentConfig.template_email_idade_body,
      template_email_faltas_subject: currentConfig.template_email_faltas_subject,
      template_email_idade_subject: currentConfig.template_email_idade_subject,
    };

    if (selectedType === "faltas") {
      updatePayload.template_email_faltas_body = editBody;
      updatePayload.template_email_faltas_subject = editSubject;
    } else {
      updatePayload.template_email_idade_body = editBody;
      updatePayload.template_email_idade_subject = editSubject;
    }

    const { data, error } = await supabase
      .from<Configuracao>("configuracoes_notificacao")
      .update(updatePayload)
      .eq("id", currentConfig.id)
      .select(
        "id, paroquia_id, paroquias(nome), template_email_faltas_subject, template_email_faltas_body, template_email_idade_subject, template_email_idade_body",
      )
      .maybeSingle();

    if (error) {
      setError(error.message);
    } else if (data) {
      setConfigs([data]);
      setIsEditingBody(false);
    }
    setSavingBody(false);
  };

  if (isLoading) {
    return <div className="text-[#94a3b8]">Carregando...</div>;
  }
  if (profile && profile.role !== "admin" && profile.role !== "coordenacao") {
    return <Navigate to="/dashboard" replace />;
  }

  // Destaca {tokens} no texto como chips coloridos
  const highlightTokens = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\{[^}]+\})/g);
    return parts.map((part, i) =>
      /^\{[^}]+\}$/.test(part) ? (
        <span
          key={i}
          style={{
            display: "inline-block",
            padding: "0px 6px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "monospace",
            fontWeight: 700,
            backgroundColor: "#f5f3ff",
            color: "#7c3aed",
            border: "1px solid #ddd6fe",
          }}
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <div>
      <PageHeader title="Notificações" subtitle="Histórico de envios" />

      <Card className="mb-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#0f172a]">Envio automático de notificações</p>
          <p className="text-sm text-[#475569]">
            O sistema envia automaticamente as notificações seguintes:
          </p>
          <ul className="list-disc list-inside text-sm text-[#475569] space-y-1">
            <li>E-mail de falta para o responsável cadastrado no aluno.</li>
            <li>E-mail de idade para a coordenação e admins do sistema.</li>
          </ul>
          <p className="text-xs text-[#64748b]">
            Os itens abaixo exibem o histórico de notificações já enviadas.
          </p>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">E-mail pronto</p>
              <p className="text-xs text-[#64748b]">
                Selecione o tipo de notificação e edite o corpo.
              </p>
            </div>
            {!isEditingBody && (
              <Button
                variant="secondary"
                onClick={startEditingBody}
                disabled={configLoading || !currentConfig}
              >
                Editar corpo
              </Button>
            )}
          </div>

          {/* Seletor de tipo */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748b] font-medium">Tipo</span>
            <div className="flex gap-2">
              <Button
                variant={selectedType === "faltas" ? "primary" : "secondary"}
                onClick={() => {
                  setSelectedType("faltas");
                  if (isEditingBody) editTemplate("faltas");
                }}
              >
                Falta
              </Button>
              <Button
                variant={selectedType === "idade" ? "primary" : "secondary"}
                onClick={() => {
                  setSelectedType("idade");
                  if (isEditingBody) editTemplate("idade");
                }}
              >
                Idade
              </Button>
            </div>
          </div>

          {/* Modo edição */}
          {isEditingBody ? (
            <div className="space-y-4">
              {/* Chips de placeholders disponíveis */}
              <div>
                <p className="text-xs font-semibold text-[#475569] mb-2 uppercase tracking-wide">
                  Variáveis disponíveis — clique para inserir no corpo
                </p>
                <div className="flex flex-wrap gap-2">
                  {(selectedType === "faltas"
                    ? [
                        "{nome}",
                        "{nome_responsavel}",
                        "{total_faltas}",
                        "{max_faltas}",
                        "{paroquia}",
                      ]
                    : [
                        "{nome}",
                        "{nome_responsavel}",
                        "{idade_atual}",
                        "{idade_minima}",
                        "{nivel}",
                        "{paroquia}",
                      ]
                  ).map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => {
                        const ta = document.getElementById(
                          "email-body-editor",
                        ) as HTMLTextAreaElement | null;
                        if (ta) {
                          const start = ta.selectionStart ?? editBody.length;
                          const end = ta.selectionEnd ?? editBody.length;
                          const newVal = editBody.slice(0, start) + ph + editBody.slice(end);
                          setEditBody(newVal);
                          setTimeout(() => {
                            ta.focus();
                            ta.selectionStart = ta.selectionEnd = start + ph.length;
                          }, 0);
                        } else {
                          setEditBody((b) => b + ph);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1.5px solid #7c3aed",
                        backgroundColor: "#f5f3ff",
                        color: "#7c3aed",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#ede9fe";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f3ff";
                      }}
                    >
                      {ph}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#94a3b8] mt-1">
                  ⚠️ <strong>{"{nome}"}</strong> e <strong>{"{nome_responsavel}"}</strong> são
                  obrigatórios no assunto e no corpo.
                </p>
              </div>

              {/* Campo assunto */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Assunto
                </label>
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full text-sm border rounded-[8px] px-3 py-2 outline-none"
                  style={{ border: "1.5px solid #e2e8f0", fontFamily: "inherit" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                />
              </div>

              {/* Campo corpo */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Corpo do e-mail
                </label>
                <textarea
                  id="email-body-editor"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="w-full text-sm border rounded-[8px] px-3 py-2 outline-none resize-y"
                  style={{
                    border: "1.5px solid #e2e8f0",
                    fontFamily: "monospace",
                    lineHeight: "1.6",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingBody(false)}
                  disabled={savingBody}
                >
                  Cancelar
                </Button>
                <Button onClick={saveBody} disabled={savingBody}>
                  {savingBody ? "Salvando..." : "Salvar corpo"}
                </Button>
              </div>
            </div>
          ) : (
            /* Modo visualização com tokens destacados */
            <div className="space-y-3">
              <div>
                <SectionLabel>Assunto</SectionLabel>
                <div className="text-sm text-[#0f172a] break-words">
                  {configLoading ? "Carregando..." : highlightTokens(emailSubject)}
                </div>
              </div>
              <div>
                <SectionLabel>Corpo do e-mail</SectionLabel>
                <pre className="text-sm text-[#475569] bg-[#f8fafc] p-3 rounded-[8px] whitespace-pre-wrap break-words leading-relaxed">
                  {configLoading ? "Carregando..." : highlightTokens(emailBody)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card className="mb-4">
          <div className="text-sm text-[#dc2626]">{error}</div>
        </Card>
      )}

      {loading ? (
        <Card>
          <p className="text-sm text-[#64748b]">Carregando histórico...</p>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <p className="text-sm text-[#64748b]">Nenhuma notificação registrada ainda.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <SectionLabel>Tipo</SectionLabel>
                  <Badge tone={log.tipo === "faltas" ? "amarelo" : "azul"}>
                    {log.tipo === "faltas" ? "Faltas" : "Idade"}
                  </Badge>
                </div>
                <div>
                  <SectionLabel>Enviar para</SectionLabel>
                  <div className="text-sm text-[#0f172a] break-words">{log.enviado_para}</div>
                </div>
                <div>
                  <SectionLabel>Enviado em</SectionLabel>
                  <div className="text-sm text-[#0f172a]">
                    {new Date(log.enviado_em).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <SectionLabel>Catequizando</SectionLabel>
                  <div className="text-sm text-[#0f172a]">{log.catequizandos?.nome ?? "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <SectionLabel>Detalhes</SectionLabel>
                  <pre className="text-xs text-[#475569] bg-[#f8fafc] p-3 rounded-[8px] overflow-x-auto">
                    {JSON.stringify(log.detalhes ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={() => editTemplate(log.tipo)}>
                  Editar modelo
                </Button>
                <Button
                  variant="secondary"
                  disabled={resendingId === log.id}
                  onClick={() => void resendNotification(log.id)}
                >
                  {resendingId === log.id ? "Reenviando..." : "Reenviar"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
