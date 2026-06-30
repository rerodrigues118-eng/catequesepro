-- =============================================================
-- Índices para performance — CatequesePRO
-- Execute este arquivo no Supabase SQL Editor
-- =============================================================

-- Catequizandos: buscas por catequista, comunidade, paróquia
CREATE INDEX IF NOT EXISTS idx_catequizandos_catequista_id ON public.catequizandos (catequista_id);
CREATE INDEX IF NOT EXISTS idx_catequizandos_comunidade_id ON public.catequizandos (comunidade_id);
CREATE INDEX IF NOT EXISTS idx_catequizandos_paroquia_id ON public.catequizandos (paroquia_id);
CREATE INDEX IF NOT EXISTS idx_catequizandos_created_at ON public.catequizandos (created_at DESC);

-- Presenças: filtros por aluno e data (as consultas mais frequentes)
CREATE INDEX IF NOT EXISTS idx_presencas_catequizando_id ON public.presencas (catequizando_id);
CREATE INDEX IF NOT EXISTS idx_presencas_data_presenca ON public.presencas (data_presenca DESC);
CREATE INDEX IF NOT EXISTS idx_presencas_catequizando_data ON public.presencas (catequizando_id, data_presenca DESC);

-- Catequistas: filtros por comunidade e status (pendentes/ativos)
CREATE INDEX IF NOT EXISTS idx_catequistas_comunidade_id ON public.catequistas (comunidade_id);
CREATE INDEX IF NOT EXISTS idx_catequistas_status ON public.catequistas (status);
CREATE INDEX IF NOT EXISTS idx_catequistas_email ON public.catequistas (email);

-- Convites: buscas por token, catequista e status de uso
CREATE INDEX IF NOT EXISTS idx_convites_catequista_id ON public.convites (catequista_id);
CREATE INDEX IF NOT EXISTS idx_convites_usado ON public.convites (usado);
CREATE INDEX IF NOT EXISTS idx_convites_expira_em ON public.convites (expira_em);

-- Profiles: busca por catequista_id (usada em auth e dashboard)
CREATE INDEX IF NOT EXISTS idx_profiles_catequista_id ON public.profiles (catequista_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Comunidades: busca por paróquia
CREATE INDEX IF NOT EXISTS idx_comunidades_paroquia_id ON public.comunidades (paroquia_id);

-- Atividades: busca por catequista, comunidade e data
CREATE INDEX IF NOT EXISTS idx_atividades_catequista_id ON public.atividades (catequista_id);
CREATE INDEX IF NOT EXISTS idx_atividades_comunidade_id ON public.atividades (comunidade_id);
CREATE INDEX IF NOT EXISTS idx_atividades_data_inicio ON public.atividades (data_inicio);

-- Garantir coluna de role na tabela de convites para suporte a coordenadores
ALTER TABLE public.convites ADD COLUMN IF NOT EXISTS role text DEFAULT 'catequista';
