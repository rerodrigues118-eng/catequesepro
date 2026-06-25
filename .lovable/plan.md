# CatequesePRO — Frontend-only (sem Lovable Cloud)

Construir todo o sistema com dados mockados em memória (sem backend, sem autenticação real, sem upload real de fotos). Cloud pode ser adicionado depois sem reescrever telas.

## Estratégia de dados

- Camada `src/lib/mock-data.ts`: arrays em memória de `paroquias`, `comunidades`, `catequistas`, `catequizandos`, `usuarios`.
- Persistência opcional em `localStorage` (chave `cateqpro:db`) para sobreviver a reloads.
- Hook `useDb()` + Context que expõe operações CRUD síncronas; React Query usado apenas como cache leve (queryFn que lê do store).
- Auth mockado: tela de login aceita dois usuários pré-cadastrados:
  - `admin@paroquia.test` / `admin` → role `admin`
  - `catequista@paroquia.test` / `catequista` → role `catequista` vinculado a um catequista seed
  - Sessão guardada em `localStorage` (`cateqpro:session`).
- Foto: compressão via canvas, resultado salvo como **dataURL** no próprio registro (sem storage). Limite 300kb mantido.
- Seed inicial: 1 paróquia, 3 comunidades, 5 catequistas, ~15 catequizandos distribuídos, com nível (iniciação / primeira eucaristia / crisma).

## Stack

- TanStack Start + React 19 + Tailwind v4 + Lucide.
- `react-hook-form` + `zod` para formulários.
- TanStack Query (já no template) para cache.
- Sem framer-motion, sem shadcn pesado — componentes próprios mínimos.

## Design system (`src/styles.css`)

Adicionar tokens em `@theme` (cores em oklch equivalentes aos hex do brief):
primary, primary-hover, accent, bg, card, border, text, text-muted, placeholder, success/erro, sidebar. Carregar **Inter** via `<link>` em `__root.tsx`. Regras de impressão em `@media print`.

Componentes utilitários em `src/components/ui-lite/`: `Card`, `Button` (primary/secondary/destructive), `Input`, `Select`, `Textarea`, `Badge` (verde/âmbar/azul), `Table` primitives, `PageHeader`, `EmptyState`, `ConfirmDialog` (sem animação), `SectionLabel`, `Avatar` (com fallback de iniciais).

## Rotas (TanStack file-based)

```
src/routes/
  __root.tsx                       (shell + QueryClient + AuthProvider + DbProvider)
  index.tsx                        (redireciona /auth ou /app/dashboard)
  auth.tsx                         (login)
  _app/route.tsx                   (layout protegido: sidebar/bottom nav + checa sessão mock)
  _app/dashboard.tsx
  _app/catequizandos.index.tsx
  _app/catequizandos.novo.tsx
  _app/catequizandos.$id.tsx
  _app/catequizandos.$id.editar.tsx
  _app/usuarios.tsx                (gate por role admin via beforeLoad)
```

Sem Lovable Cloud, **não** usamos o layout `_authenticated/` gerenciado — criamos um `_app` próprio com `beforeLoad` que lê a sessão do `localStorage`; usuários sem sessão são redirecionados para `/auth`. `/usuarios` checa adicionalmente `role === 'admin'` e redireciona para dashboard caso contrário.

## Layout shell

- Desktop ≥768px: sidebar fixa 220px, fundo `#0f172a`, logo Cross + "CatequesePRO", itens com ícone + label, ativo com `bg #1e3a8a` e barra âmbar esquerda. Rodapé com nome do usuário + botão Sair.
- Mobile <768px: bottom nav fixa (Dashboard, Cadastros, Novo, Usuários[admin]) com ícones + label curto.

## Telas (conforme spec)

1. **Login (/auth)** — card centralizado 380px, toggle de senha, erro inline. Pré-preencher dica das credenciais demo.
2. **Dashboard** — 4 cards de métricas (Catequizandos, Comunidades, Catequistas, Média/catequista), tabela "Por comunidade" com barra flat de distribuição, tabela "Por catequista" com badge "regular"/"acima da média" e mini-badges por nível (iniciação / primeira eucaristia / crisma). Select de comunidade só para admin.
3. **Lista /catequizandos** — contador em badge azul, filtros (busca, comunidade, catequista) só para admin, tabela com avatar (foto ou iniciais), ações ver/editar/excluir (excluir só admin) com `ConfirmDialog`, estado vazio, paginação simples 20/página, cards empilhados em mobile.
4. **Novo / Editar** — 2 colunas desktop (form 2/3 + painel foto 1/3), 1 coluna mobile (foto no topo). Seções: Dados Pessoais, Família, Endereço, Vínculo Paroquial (+ Nível). Idade calculada. Selects encadeados Paróquia → Comunidade → Catequista (filho reseta ao mudar pai). Upload de foto com drag/drop, compressão canvas (max 400px largura, q=0.8, rejeita se >300kb), preview 3:4, botão remover. Validação inline com zod, sem toast.
5. **Ficha /:id** — card 2 colunas (foto+nome+badges | dados em seções). Header com Voltar, Editar (admin) e Imprimir. CSS de impressão esconde chrome.
6. **Usuários** (admin) — tabela de catequistas (Nome, Email, Comunidade, Criado em, Status). Botão "+ Convidar catequista" abre modal simples; ao salvar, cria catequista + usuário mock com status "Sem login" (sem envio real de email — apenas registro local).

## Restrições enforced

- Sem framer-motion, sem animações além de `transition-colors duration-100`.
- Sombras limitadas (`0 1px 3px rgba(0,0,0,.06)` em cards; `0 4px 24px rgba(0,0,0,.08)` só no card de login).
- border-radius ≤ 12px exceto avatares circulares.
- Sem gradientes. Loading: texto "Carregando..." em `#94a3b8`.

## Quando ativar Lovable Cloud depois

A camada `useDb()` será trocada por server functions (`getDashboardStats`, `listCatequizandos`, `upsertCatequizando`, etc.) e o auth mock por `requireSupabaseAuth` + tabela `user_roles` (separada do `profiles` para evitar escalada de privilégio). Telas não mudam.

## Pontos técnicos

- Foto como dataURL ocupa espaço no localStorage; limitar tamanho final (~150kb após compressão) e avisar se exceder.
- `index.tsx` é só um redirect; o layout vive em `_app/route.tsx` retornando `<Outlet />` com sidebar/bottom nav.
- Cada rota define `head()` próprio (title/description) para SEO básico mesmo offline.
