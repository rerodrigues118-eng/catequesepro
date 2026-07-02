import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDb, calcIdade, type Catequizando, type DocumentoTipo, type Nivel } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/photo";
import { Button, Card, Field, Input, Select, SectionLabel, Textarea } from "@/components/ui-lite";

interface FormState {
  nome: string;
  data_nascimento: string;
  nome_pai: string;
  nome_mae: string;
  nome_responsavel: string;
  email_responsavel: string;
  endereco: string;
  telefone_responsavel?: string;
  telefone_responsavel2?: string;
  restricoes_medicas?: string;
  observacoes?: string;
  documento_certidao_url?: string;
  documento_batismo_url?: string;
  documento_laudo_url?: string;
  documento_responsavel_url?: string;
  documento_autorizacao_url?: string;
  paroquia_id: string;
  comunidade_id: string;
  catequista_id: string;
  nivel: Nivel;
  foto_url: string;
}

export function CatequizandoForm({ existing }: { existing?: Catequizando }) {
  const { db, createCatequizando, updateCatequizando, createDocumento } = useDb();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isCatequista = profile?.role === "catequista";
  const meCatequista = isCatequista ? db.catequistas.find((c) => c.id === profile?.catequista_id) : undefined;

  // Obter a paróquia do catequista (baseada na sua comunidade)
  const minhaParoquia = useMemo(() => {
    if (!meCatequista) return undefined;
    return db.comunidades.find((c) => c.id === meCatequista.comunidade_id)?.paroquia_id;
  }, [meCatequista, db.comunidades]);

  const defaults: FormState = useMemo(() => {
    if (existing) {
      return {
        nome: existing.nome,
        data_nascimento: existing.data_nascimento,
        nome_pai: existing.nome_pai ?? "",
        nome_mae: existing.nome_mae ?? "",
        nome_responsavel: (existing as any).nome_responsavel ?? "",
        email_responsavel: (existing as any).email_responsavel ?? "",
        endereco: existing.endereco ?? "",
        telefone_responsavel: (existing as any).telefone_responsavel ?? "",
        telefone_responsavel2: (existing as any).telefone_responsavel2 ?? "",
        restricoes_medicas: (existing as any).restricoes_medicas ?? "",
        observacoes: (existing as any).observacoes ?? "",
        documento_certidao_url: (existing as any).documento_certidao_url ?? "",
        documento_batismo_url: (existing as any).documento_batismo_url ?? "",
        documento_laudo_url: (existing as any).documento_laudo_url ?? "",
        documento_responsavel_url: (existing as any).documento_responsavel_url ?? "",
        documento_autorizacao_url: (existing as any).documento_autorizacao_url ?? "",
        paroquia_id: existing.paroquia_id,
        comunidade_id: existing.comunidade_id,
        catequista_id: existing.catequista_id,
        nivel: existing.nivel,
        foto_url: existing.foto_url ?? "",
      };
    }
    return {
      nome: "",
      data_nascimento: "",
      nome_pai: "",
      nome_mae: "",
      nome_responsavel: "",
      email_responsavel: "",
      endereco: "",
      telefone_responsavel: "",
      telefone_responsavel2: "",
      restricoes_medicas: "",
      observacoes: "",
      documento_certidao_url: "",
      documento_batismo_url: "",
      documento_laudo_url: "",
      documento_responsavel_url: "",
      documento_autorizacao_url: "",
      paroquia_id: meCatequista && minhaParoquia ? minhaParoquia : db.paroquias[0]?.id ?? "",
      comunidade_id: meCatequista ? meCatequista.comunidade_id : "",
      catequista_id: meCatequista ? meCatequista.id : "",
      nivel: "iniciacao",
      foto_url: "",
    };
  }, [existing, meCatequista, minhaParoquia, db.paroquias]);

  const [form, setForm] = useState<FormState>(defaults);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [sacramentos, setSacramentos] = useState<{
    batismo: { checked: boolean; data_recebimento: string; paroquia_local: string; celebrante: string; padrinhos: string; observacoes: string; id?: string };
    primeira_eucaristia: { checked: boolean; data_recebimento: string; paroquia_local: string; celebrante: string; padrinhos: string; observacoes: string; id?: string };
    crisma: { checked: boolean; data_recebimento: string; paroquia_local: string; celebrante: string; padrinhos: string; observacoes: string; id?: string };
  }>({
    batismo: { checked: false, data_recebimento: "", paroquia_local: "", celebrante: "", padrinhos: "", observacoes: "" },
    primeira_eucaristia: { checked: false, data_recebimento: "", paroquia_local: "", celebrante: "", padrinhos: "", observacoes: "" },
    crisma: { checked: false, data_recebimento: "", paroquia_local: "", celebrante: "", padrinhos: "", observacoes: "" },
  });

  useEffect(() => {
    if (existing) {
      supabase
        .from("sacramentos_recebidos")
        .select("*")
        .eq("catequizando_id", existing.id)
        .then(({ data }) => {
          if (data) {
            const newState = {
              batismo: { checked: false, data_recebimento: "", paroquia_local: "", celebrante: "", padrinhos: "", observacoes: "" },
              primeira_eucaristia: { checked: false, data_recebimento: "", paroquia_local: "", celebrante: "", padrinhos: "", observacoes: "" },
              crisma: { checked: false, data_recebimento: "", paroquia_local: "", celebrante: "", padrinhos: "", observacoes: "" },
            };
            data.forEach((s: any) => {
              if (s.tipo === "batismo" || s.tipo === "primeira_eucaristia" || s.tipo === "crisma") {
                newState[s.tipo as "batismo" | "primeira_eucaristia" | "crisma"] = {
                  checked: true,
                  data_recebimento: s.data_recebimento ?? "",
                  paroquia_local: s.paroquia_local ?? "",
                  celebrante: s.celebrante ?? "",
                  padrinhos: s.padrinhos ?? "",
                  observacoes: s.observacoes ?? "",
                  id: s.id,
                };
              }
            });
            setSacramentos(newState);
          }
        });
    }
  }, [existing]);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<Partial<Record<DocumentoTipo, File>>>({});
  const [pendingDocumentNames, setPendingDocumentNames] = useState<Partial<Record<DocumentoTipo, string>>>({});
  const [uploadingDocument, setUploadingDocument] = useState<Partial<Record<DocumentoTipo, boolean>>>({});
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<DocumentoTipo, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const batRef = useRef<HTMLInputElement>(null);
  const laudoRef = useRef<HTMLInputElement>(null);
  const respRef = useRef<HTMLInputElement>(null);
  const autorRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onParoquiaChange = (id: string) => {
    setForm((f) => ({ ...f, paroquia_id: id, comunidade_id: "", catequista_id: "" }));
  };
  const onComunidadeChange = (id: string) => {
    setForm((f) => ({ ...f, comunidade_id: id, catequista_id: "" }));
  };

  const comunidadesFiltradas = db.comunidades.filter((c) => c.paroquia_id === form.paroquia_id);
  const catequistasFiltrados = db.catequistas.filter((c) => c.comunidade_id === form.comunidade_id);

  const canViewDocuments = profile?.role === "admin" || profile?.role === "coordenacao";

  const idade = form.data_nascimento ? calcIdade(form.data_nascimento) : null;

  const documentFieldName = (tipo: DocumentoTipo) => {
    switch (tipo) {
      case "certidao_nascimento_rg":
        return "documento_certidao_url" as const;
      case "certidao_batismo":
        return "documento_batismo_url" as const;
      case "laudo_medico":
        return "documento_laudo_url" as const;
      case "rg_responsavel":
        return "documento_responsavel_url" as const;
      case "termo_autorizacao":
        return "documento_autorizacao_url" as const;
    }
  };

  const getDocumentState = (tipo: DocumentoTipo) => {
    const fieldName = documentFieldName(tipo);
    return {
      url: form[fieldName] ?? "",
      pendingName: pendingDocumentNames[tipo] ?? "",
      uploading: !!uploadingDocument[tipo],
      error: documentErrors[tipo],
    };
  };

  const uploadDocument = async (file: File, tipo: DocumentoTipo, catequizandoId: string) => {
    setDocumentErrors((prev) => ({ ...prev, [tipo]: undefined }));
    setUploadingDocument((prev) => ({ ...prev, [tipo]: true }));
    try {
      const created = await createDocumento({ catequizando_id: catequizandoId, tipo, file });
      const fieldName = documentFieldName(tipo);
      setField(fieldName, created.url);
      await updateCatequizando(catequizandoId, { [fieldName]: created.url } as Partial<Catequizando>);
      setPendingDocumentFiles((prev) => {
        const next = { ...prev };
        delete next[tipo];
        return next;
      });
      setPendingDocumentNames((prev) => {
        const next = { ...prev };
        delete next[tipo];
        return next;
      });
    } catch (err) {
      setDocumentErrors((prev) => ({ ...prev, [tipo]: (err as Error).message }));
    } finally {
      setUploadingDocument((prev) => ({ ...prev, [tipo]: false }));
    }
  };

  const handleDocument = async (file: File, tipo: DocumentoTipo) => {
    if (existing?.id) {
      await uploadDocument(file, tipo, existing.id);
      return;
    }

    setPendingDocumentFiles((prev) => ({ ...prev, [tipo]: file }));
    setPendingDocumentNames((prev) => ({ ...prev, [tipo]: file.name }));
    setDocumentErrors((prev) => ({ ...prev, [tipo]: undefined }));
  };

  const removeDocument = async (tipo: DocumentoTipo) => {
    const fieldName = documentFieldName(tipo);
    if (existing?.id) {
      await updateCatequizando(existing.id, { [fieldName]: null } as Partial<Catequizando>);
    }
    setField(fieldName, "");
    setPendingDocumentFiles((prev) => {
      const next = { ...prev };
      delete next[tipo];
      return next;
    });
    setPendingDocumentNames((prev) => {
      const next = { ...prev };
      delete next[tipo];
      return next;
    });
    setDocumentErrors((prev) => ({ ...prev, [tipo]: undefined }));
  };

  const uploadPendingDocuments = async (catequizandoId: string) => {
    const pendingTypes = Object.keys(pendingDocumentFiles) as DocumentoTipo[];
    for (const tipo of pendingTypes) {
      const file = pendingDocumentFiles[tipo];
      if (file) await uploadDocument(file, tipo, catequizandoId);
    }
  };

  const handlePhoto = async (file: File) => {
    setPhotoErr(null);
    try {
      const dataUrl = await compressImage(file);
      setField("foto_url", dataUrl);
    } catch (err) {
      setPhotoErr((err as Error).message);
    }
  };

  const renderDocumentRow = (tipo: DocumentoTipo, title: string, subtitle: string) => {
    const state = getDocumentState(tipo);
    const inputRef =
      tipo === "certidao_nascimento_rg"
        ? certRef
        : tipo === "certidao_batismo"
        ? batRef
        : tipo === "laudo_medico"
        ? laudoRef
        : tipo === "rg_responsavel"
        ? respRef
        : autorRef;

    return (
      <div key={tipo} className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-[#64748b]">{subtitle}</div>
          {state.pendingName && (
            <div className="text-xs text-[#2563eb] mt-1">Arquivo pronto para envio: {state.pendingName}</div>
          )}
          {state.uploading && (
            <div className="text-xs text-[#2563eb] mt-1">Upload em andamento...</div>
          )}
          {state.error && (
            <div className="text-xs text-[#dc2626] mt-1">{state.error}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleDocument(f, tipo);
            }}
          />
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            <FileText size={14} /> Enviar
          </Button>
          {state.url ? (
            <a href={state.url} target="_blank" rel="noreferrer" className="text-xs ml-2 text-[#2563eb] hover:underline">
              Ver
            </a>
          ) : null}
          {(state.url || state.pendingName) && (
            <button
              type="button"
              onClick={() => removeDocument(tipo)}
              className="text-xs text-[#dc2626] hover:underline"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const errs: typeof errors = {};
    if (!form.nome.trim()) errs.nome = "Informe o nome.";
    if (!form.data_nascimento) errs.data_nascimento = "Informe a data.";
    if (!form.paroquia_id) errs.paroquia_id = "Selecione a paróquia.";
    if (!form.comunidade_id) errs.comunidade_id = "Selecione a comunidade.";
    if (!form.catequista_id) errs.catequista_id = "Selecione o catequista.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      data_nascimento: form.data_nascimento,
      nome_pai: form.nome_pai.trim() || undefined,
      nome_mae: form.nome_mae.trim() || undefined,
      nome_responsavel: form.nome_responsavel.trim() || undefined,
      email_responsavel: form.email_responsavel.trim() || undefined,
      endereco: form.endereco.trim() || undefined,
      foto_url: form.foto_url || undefined,
      nivel: form.nivel,
      paroquia_id: form.paroquia_id,
      comunidade_id: form.comunidade_id,
      catequista_id: form.catequista_id,
    };

    const saveSacramentos = async (catequizandoId: string) => {
      const keys = ["batismo", "primeira_eucaristia", "crisma"] as const;
      for (const tipo of keys) {
        const val = sacramentos[tipo];

        if (val.checked) {
          // upsert: insere ou atualiza se já existir o mesmo (catequizando_id + tipo)
          const { error } = await supabase
            .from("sacramentos_recebidos")
            .upsert(
              {
                catequizando_id: catequizandoId,
                tipo,
                data_recebimento: val.data_recebimento || null,
                paroquia_local: val.paroquia_local || null,
                celebrante: val.celebrante || null,
                padrinhos: val.padrinhos || null,
                observacoes: val.observacoes || null,
                registrado_por: profile?.id ?? null,
              },
              { onConflict: "catequizando_id,tipo" }
            );
          if (error) throw new Error(`Erro ao salvar sacramento ${tipo}: ${error.message}`);
        } else if (val.id) {
          // desmarcado e existia antes → apaga
          const { error } = await supabase.from("sacramentos_recebidos").delete().eq("id", val.id);
          if (error) throw new Error(`Erro ao remover sacramento ${tipo}: ${error.message}`);
        }
      }
    };


    setIsSaving(true);
    try {
      if (existing) {
        await updateCatequizando(existing.id, payload);
        await saveSacramentos(existing.id);
        await uploadPendingDocuments(existing.id);
        navigate({ to: "/catequizandos/$id", params: { id: existing.id } });
      } else {
        const novo = await createCatequizando(payload);
        await saveSacramentos(novo.id);
        if (Object.keys(pendingDocumentFiles).length > 0) {
          await uploadPendingDocuments(novo.id);
        }
        navigate({ to: "/catequizandos/$id", params: { id: novo.id } });
      }
    } catch (error) {
      setSubmitError((error as Error).message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Foto panel — mobile on top, desktop right */}
      <div className="order-first lg:order-last lg:col-span-1">
        <Card>
          <SectionLabel>Foto 3x4</SectionLabel>
          <div
            className="relative rounded-[8px] flex items-center justify-center overflow-hidden bg-[#f8fafc] cursor-pointer"
            style={{ border: "2px dashed #e2e8f0", aspectRatio: "3 / 4" }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handlePhoto(f);
            }}
          >
            {form.foto_url ? (
              <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-4">
                <Upload size={24} className="mx-auto text-[#94a3b8]" />
                <p className="mt-2 text-xs text-[#64748b]">Clique ou arraste</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
              }}
            />
          </div>
          <p className="mt-2 text-xs text-[#64748b]">JPG ou PNG · máx. 300kb</p>
          {photoErr && <p className="mt-1 text-xs text-[#dc2626]">{photoErr}</p>}
          {form.foto_url && (
            <button
              type="button"
              onClick={() => setField("foto_url", "")}
              className="mt-3 inline-flex items-center gap-1 text-xs text-[#dc2626] hover:underline"
            >
              <X size={12} /> Remover foto
            </button>
          )}
        </Card>
      </div>

      {/* Formulário */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <SectionLabel>Dados pessoais</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Nome completo" required error={errors.nome}>
                <Input value={form.nome} onChange={(e) => setField("nome", e.target.value)} invalid={!!errors.nome} />
              </Field>
            </div>
            <Field label="Data de nascimento" required error={errors.data_nascimento} hint={idade !== null ? `${idade} anos` : undefined}>
              <Input
                type="date"
                value={form.data_nascimento}
                onChange={(e) => setField("data_nascimento", e.target.value)}
                invalid={!!errors.data_nascimento}
              />
            </Field>
            <Field label="Nível de catequese" required>
              <Select value={form.nivel} onChange={(e) => setField("nivel", e.target.value as Nivel)}>
                <option value="iniciacao">Iniciação</option>
                <option value="primeira_eucaristia">Primeira Eucaristia</option>
                <option value="crisma">Crisma</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>Família</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do pai">
              <Input value={form.nome_pai} onChange={(e) => setField("nome_pai", e.target.value)} />
            </Field>
            <Field label="Nome da mãe">
              <Input value={form.nome_mae} onChange={(e) => setField("nome_mae", e.target.value)} />
            </Field>
            <Field label="Nome do responsável">
              <Input value={form.nome_responsavel} onChange={(e) => setField("nome_responsavel", e.target.value)} />
            </Field>
            <Field label="Email do responsável">
              <Input type="email" value={form.email_responsavel} onChange={(e) => setField("email_responsavel", e.target.value)} />
            </Field>
            <Field label="Telefone do responsável">
              <Input value={form.telefone_responsavel} onChange={(e) => setField("telefone_responsavel", e.target.value)} />
            </Field>
            <Field label="Telefone secundário">
              <Input value={form.telefone_responsavel2} onChange={(e) => setField("telefone_responsavel2", e.target.value)} />
            </Field>
            <Field label="Restrições médicas">
              <Textarea rows={2} value={form.restricoes_medicas} onChange={(e) => setField("restricoes_medicas", e.target.value)} />
            </Field>
            <Field label="Observações">
              <Textarea rows={2} value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>Endereço</SectionLabel>
          <Field label="Endereço completo">
            <Textarea rows={2} value={form.endereco} onChange={(e) => setField("endereco", e.target.value)} />
          </Field>
        </Card>

        <Card>
          <SectionLabel>Vínculo paroquial</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Paróquia" required error={errors.paroquia_id}>
              <Select
                value={form.paroquia_id}
                onChange={(e) => onParoquiaChange(e.target.value)}
                disabled={isCatequista}
                invalid={!!errors.paroquia_id}
              >
                <option value="">Selecione</option>
                {db.paroquias.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Comunidade" required error={errors.comunidade_id}>
              <Select
                value={form.comunidade_id}
                onChange={(e) => onComunidadeChange(e.target.value)}
                disabled={isCatequista || !form.paroquia_id}
                invalid={!!errors.comunidade_id}
              >
                <option value="">Selecione</option>
                {comunidadesFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Catequista" required error={errors.catequista_id}>
              <Select
                value={form.catequista_id}
                onChange={(e) => setField("catequista_id", e.target.value)}
                disabled={isCatequista || !form.comunidade_id}
                invalid={!!errors.catequista_id}
              >
                <option value="">Selecione</option>
                {catequistasFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>Documentos</SectionLabel>
          <div className="space-y-3">
            {renderDocumentRow("certidao_nascimento_rg", "Certidão / RG do menor", "Comprova idade e filiação")}
            {renderDocumentRow("certidao_batismo", "Certidão de Batismo", "Necessário para 1ª Eucaristia/Crisma")}
            {renderDocumentRow("laudo_medico", "Laudo médico (PCD)", "Se aplicável")}
            {renderDocumentRow("rg_responsavel", "RG / CNH do responsável", "Validação de identidade")}
            {renderDocumentRow("termo_autorizacao", "Termo de Autorização e Consentimento", "Assinado pelos responsáveis")}
          </div>
        </Card>

        <Card>
          <SectionLabel>Sacramentos Recebidos</SectionLabel>
          <div className="space-y-4">
            {(["batismo", "primeira_eucaristia", "crisma"] as const).map((tipo) => {
              const label = tipo === "batismo" ? "Batismo" : tipo === "primeira_eucaristia" ? "1ª Eucaristia" : "Crisma";
              const val = sacramentos[tipo];
              return (
                <div key={tipo} className="border border-[#e2e8f0] rounded-[8px] p-4 bg-[#f8fafc] space-y-3">
                  <label className="flex items-center gap-2 font-medium text-sm text-[#0f172a] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val.checked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSacramentos((s) => ({
                          ...s,
                          [tipo]: { ...s[tipo], checked }
                        }));
                      }}
                      className="rounded border-[#cbd5e1] text-[#1e40af] focus:ring-[#1e40af]"
                    />
                    {label} recebido
                  </label>

                  {val.checked && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#e2e8f0]">
                      <Field label="Data de recebimento">
                        <Input
                          type="date"
                          value={val.data_recebimento}
                          onChange={(e) => setSacramentos((s) => ({
                            ...s,
                            [tipo]: { ...s[tipo], data_recebimento: e.target.value }
                          }))}
                        />
                      </Field>
                      <Field label="Paróquia / Local">
                        <Input
                          value={val.paroquia_local}
                          onChange={(e) => setSacramentos((s) => ({
                            ...s,
                            [tipo]: { ...s[tipo], paroquia_local: e.target.value }
                          }))}
                          placeholder="Local de celebração"
                        />
                      </Field>
                      <Field label="Celebrante">
                        <Input
                          value={val.celebrante}
                          onChange={(e) => setSacramentos((s) => ({
                            ...s,
                            [tipo]: { ...s[tipo], celebrante: e.target.value }
                          }))}
                          placeholder="Nome do Padre/Bispo"
                        />
                      </Field>
                      <Field label="Padrinhos">
                        <Input
                          value={val.padrinhos}
                          onChange={(e) => setSacramentos((s) => ({
                            ...s,
                            [tipo]: { ...s[tipo], padrinhos: e.target.value }
                          }))}
                          placeholder="Padrinho e/ou Madrinha"
                        />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="Observações">
                          <Textarea
                            rows={2}
                            value={val.observacoes}
                            onChange={(e) => setSacramentos((s) => ({
                              ...s,
                              [tipo]: { ...s[tipo], observacoes: e.target.value }
                            }))}
                            placeholder="Anotações adicionais"
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {submitError && (
          <div className="mb-4 text-sm text-[#dc2626] bg-[#fee2e2] rounded-[8px] px-4 py-3">
            {submitError}
          </div>
        )}

        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate({ to: "/catequizandos" })} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar cadastro"}
          </Button>
        </div>
      </div>
    </form>
  );
}
