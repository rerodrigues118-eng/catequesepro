import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDb, calcIdade, type Catequizando, type Nivel } from "@/lib/db";
import { compressImage } from "@/lib/photo";
import { Button, Card, Field, Input, Select, SectionLabel, Textarea } from "@/components/ui-lite";

interface FormState {
  nome: string;
  data_nascimento: string;
  nome_pai: string;
  nome_mae: string;
  endereco: string;
  paroquia_id: string;
  comunidade_id: string;
  catequista_id: string;
  nivel: Nivel;
  foto_url: string;
}

export function CatequizandoForm({ existing }: { existing?: Catequizando }) {
  const { db, createCatequizando, updateCatequizando } = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCatequista = user?.role === "catequista";
  const meCatequista = isCatequista ? db.catequistas.find((c) => c.id === user?.catequista_id) : undefined;

  const defaults: FormState = useMemo(() => {
    if (existing) {
      return {
        nome: existing.nome,
        data_nascimento: existing.data_nascimento,
        nome_pai: existing.nome_pai ?? "",
        nome_mae: existing.nome_mae ?? "",
        endereco: existing.endereco ?? "",
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
      endereco: "",
      paroquia_id: meCatequista ? db.paroquias[0]?.id ?? "" : db.paroquias[0]?.id ?? "",
      comunidade_id: meCatequista ? meCatequista.comunidade_id : "",
      catequista_id: meCatequista ? meCatequista.id : "",
      nivel: "iniciacao",
    foto_url: "",
    };
  }, [existing, meCatequista, db.paroquias]);

  const [form, setForm] = useState<FormState>(defaults);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const idade = form.data_nascimento ? calcIdade(form.data_nascimento) : null;

  const handlePhoto = async (file: File) => {
    setPhotoErr(null);
    try {
      const dataUrl = await compressImage(file);
      setField("foto_url", dataUrl);
    } catch (err) {
      setPhotoErr((err as Error).message);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
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
      endereco: form.endereco.trim() || undefined,
      foto_url: form.foto_url || undefined,
      nivel: form.nivel,
      paroquia_id: form.paroquia_id,
      comunidade_id: form.comunidade_id,
      catequista_id: form.catequista_id,
    };

    if (existing) {
      updateCatequizando(existing.id, payload);
      navigate({ to: "/catequizandos/$id", params: { id: existing.id } });
    } else {
      const novo = createCatequizando(payload);
      navigate({ to: "/catequizandos/$id", params: { id: novo.id } });
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

        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate({ to: "/catequizandos" })}>
            Cancelar
          </Button>
          <Button type="submit">Salvar cadastro</Button>
        </div>
      </div>
    </form>
  );
}
