import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { compressImage } from "./photo";

export type Nivel = "iniciacao" | "primeira_eucaristia" | "crisma";

export interface Paroquia {
  id: string;
  nome: string;
  endereco?: string;
  created_at: string;
}
export interface Comunidade {
  id: string;
  nome: string;
  paroquia_id: string;
  created_at: string;
}
export interface Catequista {
  id: string;
  nome: string;
  email?: string | null;
  comunidade_id: string;
  status?: "active" | "pending" | string;
  created_at: string;
}
export interface Catequizando {
  id: string;
  nome: string;
  data_nascimento: string; // ISO yyyy-mm-dd
  nome_pai?: string;
  nome_mae?: string;
  nome_responsavel?: string;
  email_responsavel?: string;
  endereco?: string;
  telefone_responsavel?: string;
  telefone_responsavel2?: string;
  restricoes_medicas?: string;
  observacoes?: string;
  foto_url?: string;
  documento_certidao_url?: string;
  documento_batismo_url?: string;
  documento_laudo_url?: string;
  documento_responsavel_url?: string;
  documento_autorizacao_url?: string;
  nivel: Nivel;
  catequista_id: string;
  comunidade_id: string;
  paroquia_id: string;
  created_at: string;
}

export type DocumentoTipo =
  | "certidao_nascimento_rg"
  | "certidao_batismo"
  | "laudo_medico"
  | "rg_responsavel"
  | "termo_autorizacao";

export interface Atividade {
  id: string;
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string;
  comunidade_id: string;
  catequista_id?: string;
  created_at: string;
}

export interface Presenca {
  id: string;
  catequizando_id: string;
  data_presenca: string;
  status: "presente" | "falta" | "justificada";
  observacao?: string;
  criado_por?: string | null;
  created_at: string;
}

export interface CatequizandoDocumento {
  id: string;
  catequizando_id: string;
  tipo?: DocumentoTipo | null;
  tipo_documento?: DocumentoTipo | null;
  url?: string | null;
  url_arquivo?: string | null;
  nome_arquivo?: string | null;
  criado_por?: string | null;
  created_at: string;
}

export interface Presenca {
  id: string;
  catequizando_id: string;
  data_presenca: string;
  status: "presente" | "falta" | "justificada";
  observacao?: string;
  criado_por?: string | null;
  created_at: string;
}

export interface Usuario {
  id: string;
  role: "admin" | "coordenacao" | "catequista";
  catequista_id?: string | null;
  permitir_ia?: boolean;
}

export interface Convite {
  id: string;
  email: string;
  nome: string;
  comunidade_id: string;
  catequista_id: string;
  expira_em: string;
  usado: boolean;
  role: "catequista" | "coordenacao";
  created_at: string;
}

interface DbData {
  paroquias: Paroquia[];
  comunidades: Comunidade[];
  catequistas: Catequista[];
  catequizandos: Catequizando[];
  presencas: Presenca[];
  atividades: Atividade[];
  usuarios: Usuario[];
  convites: Convite[];
}

const initialDb: DbData = {
  paroquias: [],
  comunidades: [],
  catequistas: [],
  catequizandos: [],
  presencas: [],
  atividades: [],
  usuarios: [],
  convites: [],
};

interface InviteCatequistaResult {
  ok: boolean;
  email: string;
  inviteLink: string;
  token: string;
  emailStatus: "sent" | "failed" | "not_sent";
  emailError: string | null;
}

interface DbContextValue {
  db: DbData;
  isLoading: boolean;
  refresh: () => Promise<void>;
  uploadFile: (fileOrDataUrl: File | string, folder?: string) => Promise<string>;
  createCatequizando: (data: Omit<Catequizando, "id" | "created_at">) => Promise<Catequizando>;
  updateCatequizando: (id: string, data: Partial<Catequizando>) => Promise<void>;
  deleteCatequizando: (id: string) => Promise<void>;
  createDocumento: (data: {
    catequizando_id: string;
    tipo: DocumentoTipo;
    file: File | string;
    nome_arquivo?: string;
  }) => Promise<CatequizandoDocumento>;
  createPresenca: (data: Omit<Presenca, "id" | "created_at">) => Promise<Presenca>;
  inviteCatequista: (data: { nome: string; email: string; comunidade_id: string; role?: "catequista" | "coordenacao" }) => Promise<InviteCatequistaResult>;
  deleteInvite: (catequistaId: string) => Promise<void>;
  deleteCatequista: (catequistaId: string) => Promise<void>;
  updateIAAccess: (userId: string, permitir: boolean) => Promise<void>;
}

const noop = async () => { throw new Error("useDb must be inside DbProvider"); };

const defaultDbContextValue: DbContextValue = {
  db: initialDb,
  isLoading: true,
  refresh: noop,
  uploadFile: noop,
  createCatequizando: noop,
  updateCatequizando: noop,
  deleteCatequizando: noop,
  createDocumento: noop,
  createPresenca: noop,
  inviteCatequista: noop,
  deleteInvite: noop,
  deleteCatequista: noop,
  updateIAAccess: noop,
};

const DbContext = createContext<DbContextValue>(defaultDbContextValue);

function dataUrlToFile(dataUrl: string, filename: string) {
  const [header, body] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(body);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return new File([array], filename, { type: mime });
}

const STORAGE_BUCKET = "catequizandos";

async function uploadFile(fileOrDataUrl: File | string, folder = "catequizandos", filePathOverride?: string) {
  let file: File;
  if (typeof fileOrDataUrl === "string") {
    if (!fileOrDataUrl.startsWith("data:")) return fileOrDataUrl;
    file = dataUrlToFile(fileOrDataUrl, `upload-${Date.now()}.jpg`);
  } else {
    file = fileOrDataUrl;
  }

  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const filePath = filePathOverride ?? `${folder}/${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}${extension}`;
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) {
    throw new Error(uploadError.message);
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error("Falha ao recuperar URL do arquivo.");
  }
  return data.publicUrl;
}

async function uploadPhoto(dataUrl: string) {
  return uploadFile(dataUrl, "catequizandos");
}

export function DbProvider({ children }: { children: ReactNode }) {
  const { profile, session } = useAuth();
  const [db, setDb] = useState<DbData>(initialDb);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    if (!profile) {
      setDb(initialDb);
      setIsLoading(false);
      return;
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().slice(0, 10);

    const [paroquiasRes, comunidadesRes, catequistasRes, presencasRes, atividadesRes, usuariosRes, convitesRes] = await Promise.all([
      supabase.from<Paroquia>("paroquias").select("*").order("nome", { ascending: true }),
      supabase.from<Comunidade>("comunidades").select("*").order("nome", { ascending: true }),
      supabase.from<Catequista>("catequistas").select("*").order("nome", { ascending: true }),
      supabase.from<Presenca>("presencas").select("*").gte("data_presenca", ninetyDaysAgoStr).order("data_presenca", { ascending: false }),
      supabase.from<Atividade>("atividades").select("*").order("data_inicio", { ascending: true }),
      supabase.from<Usuario>("profiles").select("id, role, catequista_id, permitir_ia").then((res) => {
        if (res.error) {
          return supabase.from<Usuario>("profiles").select("id, role, catequista_id");
        }
        return res;
      }),
      supabase.from<Convite>("convites").select("*"),
    ]);

    const partialDb = {
      paroquias: paroquiasRes.data ?? initialDb.paroquias,
      comunidades: comunidadesRes.data ?? initialDb.comunidades,
      catequistas: catequistasRes.data ?? initialDb.catequistas,
      presencas: presencasRes.data ?? initialDb.presencas,
      atividades: atividadesRes.data ?? initialDb.atividades,
      usuarios: usuariosRes.data ?? initialDb.usuarios,
      convites: convitesRes.data ?? initialDb.convites,
      catequizandos: initialDb.catequizandos,
    };

    if (
      paroquiasRes.error || comunidadesRes.error || catequistasRes.error ||
      presencasRes.error || atividadesRes.error
    ) {
      console.error(
        paroquiasRes.error ?? comunidadesRes.error ?? catequistasRes.error ??
        presencasRes.error ?? atividadesRes.error,
      );
      setDb((currentDb) => ({
        ...currentDb,
        ...partialDb,
      }));
      setIsLoading(false);
      return;
    }

    // Log non-critical errors (catequistas may not have access to these)
    if (usuariosRes.error) console.warn("usuarios query error (may be RLS):", usuariosRes.error.message);
    if (convitesRes.error) console.warn("convites query error (may be RLS):", convitesRes.error.message);


    // Build catequizandos query with proper chaining
    const isCatequista = profile.role === "catequista" && !!profile.catequista_id;
    let catequizandosData: Catequizando[] = [];
    let catequizandosError: unknown = null;

    if (isCatequista) {
      // Catequistas only load their own students
      const res = await supabase
        .from<Catequizando>("catequizandos")
        .select("*")
        .eq("catequista_id", profile.catequista_id!)
        .order("created_at", { ascending: false });
      catequizandosData = res.data ?? [];
      catequizandosError = res.error;
    } else {
      const res = await supabase
        .from<Catequizando>("catequizandos")
        .select("*")
        .order("created_at", { ascending: false });
      catequizandosData = res.data ?? [];
      catequizandosError = res.error;
    }

    if (catequizandosError) {
      console.error(catequizandosError);
      setDb((currentDb) => ({
        ...currentDb,
        ...partialDb,
        catequizandos: currentDb.catequizandos,
      }));
      setIsLoading(false);
      return;
    }

    // For catequistas, filter presencas to only their students for better performance
    let filteredPresencas = presencasRes.data ?? [];
    if (isCatequista && catequizandosData.length > 0) {
      const myStudentIds = new Set(catequizandosData.map((c) => c.id));
      filteredPresencas = filteredPresencas.filter((p) => myStudentIds.has(p.catequizando_id));
    }

    setDb({
      paroquias: paroquiasRes.data ?? [],
      comunidades: comunidadesRes.data ?? [],
      catequistas: catequistasRes.data ?? [],
      catequizandos: catequizandosData,
      presencas: filteredPresencas,
      atividades: atividadesRes.data ?? [],
      usuarios: usuariosRes.data ?? [],
      convites: convitesRes.data ?? [],
    });
    setIsLoading(false);
  }, [profile]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const uploadFileHelper = useCallback(async (fileOrDataUrl: File | string, folder?: string) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de enviar arquivos.");
    }
    return uploadFile(fileOrDataUrl, folder);
  }, [session]);

  const createCatequizando = useCallback(async (data: Omit<Catequizando, "id" | "created_at">) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de criar um catequizando.");
    }
    const payload = { ...data };
    if (payload.foto_url) {
      payload.foto_url = await uploadFile(payload.foto_url, "catequizandos");
    }
    const { data: created, error } = await supabase.from<Catequizando>("catequizandos").insert(payload).select("*").single();
    if (error || !created) {
      throw new Error(error?.message ?? "Falha ao criar catequizando.");
    }
    setDb((state) => ({ ...state, catequizandos: [created, ...state.catequizandos] }));
    return created;
  }, [session]);

  const updateCatequizando = useCallback(async (id: string, data: Partial<Catequizando>) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de atualizar o catequizando.");
    }
    const payload = { ...data } as Partial<Catequizando>;
    if (payload.foto_url && payload.foto_url.startsWith("data:")) {
      payload.foto_url = await uploadFile(payload.foto_url, "catequizandos");
    }
    const { error } = await supabase.from("catequizandos").update(payload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    setDb((state) => ({
      ...state,
      catequizandos: state.catequizandos.map((item) => (item.id === id ? { ...item, ...payload } : item)),
    }));
  }, [session]);

  const createDocumento = useCallback(async ({ catequizando_id, tipo, file, nome_arquivo }: {
    catequizando_id: string;
    tipo: DocumentoTipo;
    file: File | string;
    nome_arquivo?: string;
  }) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de enviar o documento.");
    }

    const resolvedFileName = nome_arquivo ?? (typeof file === "string" ? `documento-${Date.now()}` : file.name);
    const storagePath = `documentos/${catequizando_id}/${tipo}/${resolvedFileName}`;
    const url = await uploadFile(file, "catequizandos", storagePath);
    const payload = {
      catequizando_id,
      tipo_documento: tipo,
      tipo,
      url_arquivo: url,
      url,
      nome_arquivo: resolvedFileName,
    };
    const { data: created, error } = await supabase.from<CatequizandoDocumento>("catequizando_documentos").insert(payload).select("*").single();
    if (error || !created) {
      const errorMsg = error?.message ?? "Falha ao criar documento.";
      console.error("Erro ao inserir documento:", { error, payload });
      throw new Error(errorMsg);
    }

    return {
      ...created,
      tipo: (created as CatequizandoDocumento).tipo_documento ?? tipo,
      url: (created as CatequizandoDocumento).url_arquivo ?? url,
      nome_arquivo: (created as CatequizandoDocumento).nome_arquivo ?? resolvedFileName,
    } as CatequizandoDocumento;
  }, [session]);

  const createPresenca = useCallback(async (data: Omit<Presenca, "id" | "created_at">) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de registrar presença.");
    }
    const { data: created, error } = await supabase
      .from<Presenca>("presencas")
      .upsert(data, { onConflict: ["catequizando_id", "data_presenca"] })
      .select("*")
      .single();

    if (error || !created) {
      throw new Error(error?.message ?? "Falha ao criar presença.");
    }
    setDb((state) => ({
      ...state,
      presencas: [created, ...state.presencas.filter((item) => !(item.catequizando_id === created.catequizando_id && item.data_presenca === created.data_presenca))],
    }));
    return created;
  }, [session]);

  const deleteCatequizando = useCallback(async (id: string) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de excluir o catequizando.");
    }
    const { error } = await supabase.from("catequizandos").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    setDb((state) => ({
      ...state,
      catequizandos: state.catequizandos.filter((item) => item.id !== id),
    }));
  }, [session]);

  const inviteCatequista = useCallback(async ({ nome, email, comunidade_id, role }: { nome: string; email: string; comunidade_id: string; role?: "catequista" | "coordenacao" }) => {
    const response = await fetch("/api/-invite-catequista", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ nome, email, comunidade_id, role }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Falha ao convidar usuário.");
    }

    await refresh();
    return payload as InviteCatequistaResult;
  }, [session, refresh]);

  const deleteInvite = useCallback(async (catequistaId: string) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de excluir o convite.");
    }
    const response = await fetch("/api/-delete-invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ catequista_id: catequistaId }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? "Falha ao excluir convite.");
    }
    await refresh();
  }, [session, refresh]);

  const deleteCatequista = useCallback(async (catequistaId: string) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente antes de excluir o acesso do catequista.");
    }
    const response = await fetch("/api/-delete-catequista", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ catequista_id: catequistaId }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? "Falha ao excluir acesso do catequista.");
    }
    await refresh();
  }, [session, refresh]);

  const updateIAAccess = useCallback(async (userId: string, permitir: boolean) => {
    if (!session) {
      throw new Error("Sessão expirada ou usuário não autenticado.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ permitir_ia: permitir })
      .eq("id", userId);
    if (error) {
      throw new Error(error.message);
    }
    setDb((state) => ({
      ...state,
      usuarios: state.usuarios.map((u) => (u.id === userId ? { ...u, permitir_ia: permitir } : u)),
    }));
  }, [session]);

  const value = useMemo(
    () => ({
      db,
      isLoading,
      refresh,
      uploadFile: uploadFileHelper,
      createCatequizando,
      updateCatequizando,
      deleteCatequizando,
      createDocumento,
      createPresenca,
      inviteCatequista,
      deleteInvite,
      deleteCatequista,
      updateIAAccess,
    }),
    [
      db,
      isLoading,
      refresh,
      uploadFileHelper,
      createCatequizando,
      updateCatequizando,
      deleteCatequizando,
      createDocumento,
      createPresenca,
      inviteCatequista,
      deleteInvite,
      deleteCatequista,
      updateIAAccess,
    ],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  return useContext(DbContext);
}

export function nivelLabel(n: Nivel) {
  return n === "iniciacao" ? "Iniciação" : n === "primeira_eucaristia" ? "1ª Eucaristia" : "Crisma";
}

export function calcIdade(dataNascimento: string): number {
  if (!dataNascimento) return 0;
  const dn = new Date(dataNascimento);
  const today = new Date();
  let idade = today.getFullYear() - dn.getFullYear();
  const m = today.getMonth() - dn.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dn.getDate())) idade--;
  return idade;
}
