# Petit Allegro Manager — Manual de Arquitetura

Sistema de gestao para escola de ballet itinerante. V2 em producao (Auth + RBAC).
Este arquivo dita COMO o codigo deve ser escrito. Padroes anteriores (client fetching, useEffect para dados, cascata de requests) estao DEPRECADOS — qualquer sugestao nesse formato deve ser recusada.

## Stack

- Next.js 16 (App Router, async Server Components) + React 19 + TypeScript 5 strict
- Tailwind CSS 4 + shadcn/ui 4 (Radix) + Zod 4
- Supabase (PostgreSQL, Auth, RLS, `@supabase/ssr`) + `jose` (JWT verify local)
- Asaas (webhooks de pagamento)
- Alias `@/*` → `src/*`

## Regras Visuais (obrigatorias)

- Fonte unica: Roboto (400/500/700). PROIBIDO serifadas (Playfair, Georgia, etc)
- Tema "Teatro Portugues": rosa ballet (primary), ouro envelhecido (--gold), marfim (background)
- Damask SVG pattern (opacity 4%) no background; cards com bordas douradas
- Cores `oklch` em `globals.css`. Dark mode definido mas nao ativado
- Mobile-first: grids fluidos, modais com `max-h` + `overflow-y-auto`
- Radix/shadcn exigem tags de acessibilidade (ex: `SheetTitle` invisivel se necessario)

## Auth & RBAC (regras estritas)

- Middleware (`src/middleware.ts`) valida JWT LOCALMENTE via `jose.jwtVerify` + `createRemoteJWKSet` em escopo de modulo (cache JWKS preservado entre requests)
- Role lida de `claims.app_metadata.role` — ZERO chamadas a Supabase no hot path. Fallback a `profiles` existe APENAS para tokens emitidos antes da trigger de sync (legacy)
- 3 clientes Supabase, NUNCA misturar:
  - `createClient()` (`supabase-server.ts`) — SSR (anon + cookies, auth.getUser())
  - `getServiceSupabase()` (`supabase.ts`) — service_role para queries em Server Actions
  - `createMiddlewareClient()` (`supabase-middleware.ts`) — refresh de sessao no middleware
- Server Actions chamam `requireAuth()` ou `requireAdmin()` antes de qualquer query
- Roles: `admin` (total) / `teacher` (Home sem metricas financeiras, Alunas sem financeiro, Chamadas)
- Teacher BLOQUEADO em `/finances`, `/locations`, `/classes`, `/admin`
- Default ao criar usuario: `teacher` (seguranca por padrao)

## Data Fetching — Pure SSR (OBRIGATORIO)

- PROIBIDO `useEffect` + `useState` para buscar dados em client component
- PROIBIDO cascata client-side (mount → fetch → setState → render → fetch)
- `page.tsx` e SEMPRE async Server Component:
  - Le `searchParams` (Promise no Next 16: `const sp = await searchParams`)
  - Chama Server Actions em paralelo via `Promise.all`
  - Passa dados como `initialX` / `currentX` props ao Client Component
- URL e a UNICA FONTE DE VERDADE para filtros/paginacao/busca. Usar `useUrlParams` hook + `setParams({key: value})`
- Sentinelas para "vazio": `__all__`, `__none__` (resolvidos no Server Component, nunca enviados ao banco)
- `loading.tsx` por rota com skeleton — Suspense durante transicao de URL
- Toda pagina privada em `(dashboard)/` declara `export const dynamic = "force-dynamic"` (depende de cookies/auth)

## Mutacoes

- Server Actions retornam `ActionResult<T>` (`{success: true, data}` | `{success: false, error}`)
- Validacao Zod com `safeParse`; use `.strict()` em update partials para evitar mass-assignment
- Try/catch em toda action; fallback `handleAuthError(e)`; erros de DB via `safeDbError()`
- Action chama `revalidatePath()` ao final
- Cliente, apos sucesso, faz `startTransition(() => router.refresh())` — NADA de refetch manual ou state-copy
- Toasts (`sonner`) em toda operacao de escrita: `toast.success` / `toast.error`

## Estado no Cliente

- Client Component recebe dados como `initialX` props e usa direto (`const items = initialItems`)
- PROIBIDO copiar props para `useState` para "manter dados em cache"
- Reset de estado quando prop muda (selecao bulk-delete, form de chamada) — padrao oficial React "adjust state during render":
  - `const [prev, setPrev] = useState(prop); if (prev !== prop) { setPrev(prop); setLocal(...); }`
  - PROIBIDO `useEffect` para esse reset (viola `react-hooks/set-state-in-effect`)
- `useTransition` mantido SO para feedback de mutacao (botoes "salvando...", "excluindo...")
- Loadings de fetch (`loading={isPending}` em tabelas, `!isPending && ...` gates) ja foram removidos — nao reintroduzir

## Observabilidade

- Logs `[PERF]` via `startPerf(name)` em `src/lib/perf.ts` — `performance.now()` + `console.log` puro
- Instrumentado em: `middleware.ts` (com sub-medicoes jwt/role), `getStudentsPaginated`, `getFinancialByMonth`, `getAttendanceByClassAndDate`
- Padrao: `try { ... } finally { endPerf(); }` cobre sucesso, erro de validacao e excecoes
- PROIBIDO adicionar APMs externos (Datadog, Sentry, Winston) sem aprovacao explicita
- NAO instrumentar CRUDs minimos nem client components

## Banco (7 tabelas)

`profiles`, `locations`, `classes`, `students`, `enrollments`, `monthly_fees`, `attendance`. Trigger auto-cria profile com role default `teacher`. Trigger sincroniza `role` para `app_metadata` do JWT. Alteracoes de schema: atualizar `supabase/schema.sql` + `types/database.ts` simultaneamente.

Regras de negocio: cada local cobra taxa fixa/aluna; matriculas active/inactive/pending com `due_day` 5 ou 7; `monthly_fees.net_amount = gross - asaas_fee - location_fee`; webhook Asaas dispara `PAYMENT_RECEIVED/CONFIRMED/OVERDUE/DELETED/REFUNDED`; chamada com 3 status (present/absent/justified) via upsert em lote.

## Estrutura

```
src/
├── app/
│   ├── actions/         # "use server", ActionResult<T>, requireAuth/Admin
│   ├── api/webhooks/    # webhook Asaas (token validation)
│   ├── login/           # publico
│   └── (dashboard)/     # privado, force-dynamic, header + bottom nav + sheet "Mais"
├── components/
│   ├── ui/              # shadcn/ui
│   └── [modulo]/        # UI pura: props + callbacks, sem Server Actions diretas
├── lib/
│   ├── supabase*.ts     # 3 clientes (server, service, middleware)
│   ├── auth-guard.ts    # requireAuth, requireAdmin, handleAuthError
│   ├── action-result.ts # ActionResult<T>
│   ├── safe-error.ts    # safeDbError
│   ├── perf.ts          # startPerf
│   ├── user-role-context.tsx  # useIsAdmin, useUserProfile
│   ├── use-url-params.ts      # URL = source of truth
│   └── formatters.ts    # moeda, datas (timezone Brasilia)
├── middleware.ts
└── types/database.ts
```

## Comandos

```bash
npm run dev    # dev server
npm run build  # build producao
npm run lint   # eslint
```

## Pendencias V3+

Dark mode (ThemeProvider faltando), PWA/offline, relatorios PDF/Excel, push notifications (lembrete de aula, cobranca).
