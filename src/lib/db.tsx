import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Nivel = "iniciacao" | "primeira_eucaristia" | "crisma";

export interface Paroquia {
  id: string;
  nome: string;
  endereco?: string;
}
export interface Comunidade {
  id: string;
  nome: string;
  paroquia_id: string;
}
export interface Catequista {
  id: string;
  nome: string;
  email: string;
  comunidade_id: string;
  created_at: string;
}
export interface Catequizando {
  id: string;
  nome: string;
  data_nascimento: string; // ISO yyyy-mm-dd
  nome_pai?: string;
  nome_mae?: string;
  endereco?: string;
  foto_url?: string; // dataURL
  nivel: Nivel;
  catequista_id: string;
  comunidade_id: string;
  paroquia_id: string;
  created_at: string;
}
export interface Usuario {
  id: string;
  email: string;
  password: string;
  role: "admin" | "catequista";
  nome: string;
  catequista_id?: string;
  status: "ativo" | "sem_login";
  created_at: string;
}

interface DbState {
  paroquias: Paroquia[];
  comunidades: Comunidade[];
  catequistas: Catequista[];
  catequizandos: Catequizando[];
  usuarios: Usuario[];
}

const STORAGE_KEY = "cateqpro:db:v1";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function seed(): DbState {
  const paroquia: Paroquia = {
    id: uid(),
    nome: "Paróquia Nossa Senhora Aparecida",
    endereco: "Rua das Flores, 123 — Centro",
  };
  const comunidades: Comunidade[] = [
    { id: uid(), nome: "Matriz", paroquia_id: paroquia.id },
    { id: uid(), nome: "São José", paroquia_id: paroquia.id },
    { id: uid(), nome: "Santo Antônio", paroquia_id: paroquia.id },
  ];
  const catequistas: Catequista[] = [
    { id: uid(), nome: "Maria Aparecida", email: "maria@paroquia.test", comunidade_id: comunidades[0].id, created_at: new Date().toISOString() },
    { id: uid(), nome: "João Pedro", email: "joao@paroquia.test", comunidade_id: comunidades[0].id, created_at: new Date().toISOString() },
    { id: uid(), nome: "Ana Lucia", email: "ana@paroquia.test", comunidade_id: comunidades[1].id, created_at: new Date().toISOString() },
    { id: uid(), nome: "Carlos Henrique", email: "carlos@paroquia.test", comunidade_id: comunidades[1].id, created_at: new Date().toISOString() },
    { id: uid(), nome: "Fátima Souza", email: "fatima@paroquia.test", comunidade_id: comunidades[2].id, created_at: new Date().toISOString() },
  ];

  const niveis: Nivel[] = ["iniciacao", "primeira_eucaristia", "crisma"];
  const nomes = [
    "Lucas Silva", "Mariana Costa", "Pedro Henrique Alves", "Beatriz Oliveira",
    "Gabriel Souza", "Júlia Ferreira", "Rafael Lima", "Isabela Santos",
    "Matheus Rocha", "Larissa Pereira", "Vinícius Almeida", "Sophia Carvalho",
    "Thiago Ribeiro", "Helena Martins", "Bernardo Gomes", "Valentina Dias",
  ];
  const catequizandos: Catequizando[] = nomes.map((nome, i) => {
    const cat = catequistas[i % catequistas.length];
    const idade = 8 + (i % 8);
    const dn = new Date();
    dn.setFullYear(dn.getFullYear() - idade);
    return {
      id: uid(),
      nome,
      data_nascimento: dn.toISOString().slice(0, 10),
      nome_pai: `${nome.split(" ")[0]} (pai)`,
      nome_mae: `${nome.split(" ")[0]} (mãe)`,
      endereco: "Rua Exemplo, 100",
      nivel: niveis[i % niveis.length],
      catequista_id: cat.id,
      comunidade_id: cat.comunidade_id,
      paroquia_id: paroquia.id,
      created_at: new Date().toISOString(),
    };
  });

  const usuarios: Usuario[] = [
    {
      id: uid(),
      email: "admin@paroquia.test",
      password: "admin",
      role: "admin",
      nome: "Administrador",
      status: "ativo",
      created_at: new Date().toISOString(),
    },
    {
      id: uid(),
      email: "catequista@paroquia.test",
      password: "catequista",
      role: "catequista",
      nome: catequistas[0].nome,
      catequista_id: catequistas[0].id,
      status: "ativo",
      created_at: new Date().toISOString(),
    },
  ];

  return { paroquias: [paroquia], comunidades, catequistas, catequizandos, usuarios };
}

function load(): DbState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as DbState;
  } catch {
    return seed();
  }
}

interface DbContextValue {
  db: DbState;
  reset: () => void;
  // catequizandos
  createCatequizando: (data: Omit<Catequizando, "id" | "created_at">) => Catequizando;
  updateCatequizando: (id: string, data: Partial<Catequizando>) => void;
  deleteCatequizando: (id: string) => void;
  // usuarios / catequistas
  inviteCatequista: (data: { nome: string; email: string; comunidade_id: string }) => void;
}

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DbState>(() => load());

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      } catch {
        /* quota */
      }
    }
  }, [db]);

  const reset = useCallback(() => {
    const s = seed();
    setDb(s);
  }, []);

  const createCatequizando: DbContextValue["createCatequizando"] = useCallback((data) => {
    const novo: Catequizando = { ...data, id: uid(), created_at: new Date().toISOString() };
    setDb((d) => ({ ...d, catequizandos: [novo, ...d.catequizandos] }));
    return novo;
  }, []);

  const updateCatequizando: DbContextValue["updateCatequizando"] = useCallback((id, data) => {
    setDb((d) => ({
      ...d,
      catequizandos: d.catequizandos.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
  }, []);

  const deleteCatequizando: DbContextValue["deleteCatequizando"] = useCallback((id) => {
    setDb((d) => ({ ...d, catequizandos: d.catequizandos.filter((c) => c.id !== id) }));
  }, []);

  const inviteCatequista: DbContextValue["inviteCatequista"] = useCallback(({ nome, email, comunidade_id }) => {
    const cat: Catequista = { id: uid(), nome, email, comunidade_id, created_at: new Date().toISOString() };
    const usr: Usuario = {
      id: uid(),
      email,
      password: "catequista",
      role: "catequista",
      nome,
      catequista_id: cat.id,
      status: "sem_login",
      created_at: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, catequistas: [...d.catequistas, cat], usuarios: [...d.usuarios, usr] }));
  }, []);

  const value = useMemo<DbContextValue>(
    () => ({ db, reset, createCatequizando, updateCatequizando, deleteCatequizando, inviteCatequista }),
    [db, reset, createCatequizando, updateCatequizando, deleteCatequizando, inviteCatequista],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be inside DbProvider");
  return ctx;
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
