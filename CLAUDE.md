# Petit Allegro Manager — Manual de Arquitetura

Sistema de gestao para escola de ballet itinerante. V2 em producao (Auth + RBAC).
Este arquivo dita COMO o codigo deve ser escrito. Padroes anteriores (client fetching, useEffect para dados, cascata de requests) estao DEPRECADOS — qualquer sugestao nesse formato deve ser recusada.

## Stack

- Next.js 16 (App Router, async Server Components) + React 19 + TypeScript 5 strict
- Tailwind CSS 4 + shadcn/ui 4 (Radix) + Zod 4
- Supabase (PostgreSQL, Auth, RLS, `@supabase/ssr`) + `jose` (JWT verify local)
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
- Logica de resolucao de role centralizada em `src/lib/role-resolver.ts` — middleware e `auth-guard` compartilham o mesmo `resolveRole(supabase, userId, appMetadata)`
- 3 clientes Supabase, NUNCA misturar:
  - `createClient()` (`supabase-server.ts`) — SSR (anon + cookies, auth.getUser())
  - `getServiceSupabase()` (`supabase.ts`) — service_role para queries em Server Actions
  - `createMiddlewareClient()` (`supabase-middleware.ts`) — refresh de sessao no middleware
- Server Actions chamam `requireAuth()` ou `requireAdmin()` antes de qualquer query
- Roles: `admin` (total) / `teacher` (Home sem metricas financeiras, Alunas sem financeiro, Chamadas)
- Teacher BLOQUEADO em `/finances`, `/locations`, `/classes`, `/admin`
- Default ao criar usuario: `teacher` (seguranca por padrao)
- **Escopo de teacher**: NAO ha autorizacao por turma/local — qualquer teacher autenticada pode salvar chamada de qualquer turma e ler perfil de qualquer aluna. Decisao consciente para a operacao atual (1 admin + 1 teacher cobrindo todas as creches). Se o quadro crescer, modelar `teacher_assignments(profile_id, location_id)` e filtrar `enrollment.class.location_id` em `saveAttendance`/`getStudentSummary`.
- **Captcha no login**: Cloudflare Turnstile via integracao nativa do Supabase Auth. Habilitar em `Authentication → Bot/Abuse Protection → CAPTCHA = Turnstile` e setar `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Sem a env var, o widget nao renderiza (DX em dev); em prod, o servidor Supabase rejeita `signInWithPassword` sem o token quando o painel esta com captcha ON. `actions/auth.ts:signIn` repassa o token via `options.captchaToken`.

## Data Fetching — Pure SSR (OBRIGATORIO)

- PROIBIDO `useEffect` + `useState` para buscar dados em client component
- PROIBIDO cascata client-side (mount → fetch → setState → render → fetch)
- `page.tsx` e SEMPRE async Server Component:
  - Le `searchParams` (Promise no Next 16: `const sp = await searchParams`)
  - Chama Server Actions em paralelo via `Promise.all`
  - Passa dados como `initialX` / `currentX` props ao Client Component
- URL e a UNICA FONTE DE VERDADE para filtros/paginacao/busca. Usar `useUrlParams` hook + `setParams({key: value})`
- Sentinelas para "vazio": `__all__`, `__none__` (resolvidos no Server Component, nunca enviados ao banco)
- Busca textual usa `<DebouncedSearchInput>` (300ms, `?q` na URL); server-side filtra via `.or()` ilike + sanitizacao de operadores PostgREST
- `loading.tsx` por rota com skeleton — Suspense durante transicao de URL
- Toda pagina privada em `(dashboard)/` declara `export const dynamic = "force-dynamic"` (depende de cookies/auth)

## Mutacoes

- Server Actions retornam `ActionResult<T>` (`{success: true, data}` | `{success: false, error}`)
- Validacao Zod com `safeParse`; use `.strict()` em update partials para evitar mass-assignment
- Schemas usados em client + server vivem em `lib/*-schemas.ts` (ex: `auth-schemas.ts` com `loginSchema`) — fonte unica
- Try/catch em toda action; auth/role guard ANTES da validacao; fallback `handleAuthError(e)`; erros de DB via `safeDbError()`
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

## Helpers compartilhados (DRY de conhecimento)

- `lib/financial-utils.ts` — `isFeeOverdue(referenceMonth, dueDay)` (compara `todayISO()` com a data de vencimento como string YYYY-MM-DD; "no proprio dia ainda e Pendente")
- `lib/enrollment-utils.ts` — `computeEnrollmentDates(validityType)` (start + end com year rollover correto)
- `lib/supabase-helpers.ts` — `unwrapJoin(value)` para joins PostgREST que retornam objeto-vs-array
- `lib/role-resolver.ts` — `resolveRole` compartilhado por middleware (Edge) e auth-guard (server actions)
- Regra: extrair so quando o MESMO conceito de negocio aparece em multiplos lugares e evolui junto. Duplicacao estrutural (formularios parecidos com campos diferentes) NAO conta.

## Observabilidade

- Logs `[PERF]` via `startPerf(name)` em `src/lib/perf.ts` — `performance.now()` + `console.log` puro
- Instrumentado em: `middleware.ts` (com sub-medicoes jwt/role), `getStudentsPaginated`, `getFinancialByMonth`, `getAttendanceByClassAndDate`, `undoPaymentsBatch`
- Padrao: `try { ... } finally { endPerf(); }` cobre sucesso, erro de validacao e excecoes
- PROIBIDO adicionar APMs externos (Datadog, Sentry, Winston) sem aprovacao explicita
- NAO instrumentar CRUDs minimos nem client components

## Banco (7 tabelas)

`profiles`, `locations`, `classes`, `students`, `enrollments`, `monthly_fees`, `attendance`. Trigger auto-cria profile com role default `teacher`. Trigger sincroniza `role` para `app_metadata` do JWT. Alteracoes de schema: atualizar `supabase/schema.sql` + `types/database.ts` simultaneamente.

Regras de negocio: cada local cobra taxa fixa/aluna; matriculas active/inactive/pending com `due_day` 5 ou 7; `monthly_fees.net_amount` permanece como coluna gerada do schema (campos legados `asaas_fee`/`asaas_payment_id` preservados estruturalmente, mas nao usados — recebimento e 100% manual via `payFeeManually`/`payFeesBatchManually`); chamada com 3 status (present/absent/justified) via upsert em lote; `enrollments.ends_at` e gravado mas nao consumido (ver Proximos Passos).

## Estrutura

```
src/
├── app/
│   ├── actions/         # "use server", ActionResult<T>, requireAuth/Admin
│   ├── login/           # publico
│   └── (dashboard)/     # privado, force-dynamic
│       ├── (rotas)/     # finances, students, classes, locations, attendance, import
│       └── dashboard-shell.tsx  # header + bottom nav + sheet "Mais"
├── components/
│   ├── ui/              # shadcn/ui + customs (debounced-search-input, delete-dialog, pagination-controls)
│   └── [modulo]/        # UI pura: props + callbacks, sem Server Actions diretas
├── lib/
│   ├── supabase*.ts     # 3 clientes (server, service, middleware)
│   ├── auth-guard.ts    # requireAuth, requireAdmin, handleAuthError
│   ├── role-resolver.ts # resolveRole compartilhado middleware/server
│   ├── auth-schemas.ts  # Zod schemas client+server (loginSchema)
│   ├── action-result.ts # ActionResult<T>
│   ├── safe-error.ts    # safeDbError
│   ├── perf.ts          # startPerf
│   ├── user-role-context.tsx  # useIsAdmin, useUserProfile
│   ├── use-url-params.ts      # URL = source of truth
│   ├── formatters.ts    # moeda, datas (timezone Brasilia)
│   ├── csv-import.ts    # parsing puro CSV (importavel cliente/servidor)
│   ├── financial-utils.ts     # isFeeOverdue
│   ├── enrollment-utils.ts    # computeEnrollmentDates
│   └── supabase-helpers.ts    # unwrapJoin
├── middleware.ts
└── types/database.ts
```

## Comandos

```bash
npm run dev    # dev server
npm run build  # build producao
npm run lint   # eslint
```

## Proximos Passos

Backlog priorizado para V3+:

- **Dark mode**: tema `oklch` ja definido em `globals.css`, falta `ThemeProvider` no `app/layout.tsx` + toggle no `UserNav`.
- **Vencimento automatico de matriculas**: `enrollments.ends_at` e gravado mas nunca lido. Adicionar job/check para flagar matriculas vencendo (>D7 antes) e bloquear geracao de mensalidade quando expirada.
- **Relatorios PDF/Excel**: exportar mensalidades do mes (financeiro), frequencia por turma (chamada). Provavelmente `react-pdf` ou render server-side.
- **Push notifications**: lembrete de aula no dia (teacher), cobranca de mensalidade vencida (admin/responsavel). Requer service worker + permissao do navegador + integracao com FCM ou similar.
- **PWA / offline**: chamada e o caso mais critico — professoras em creches sem 4G. Cache de turma + fila de upsert quando voltar online.
- **Dashboard expandido**: ocupacao por turma (matriculadas/max_students), faltas-mes por turma, ranking de inadimplencia.
- **Historico financeiro por aluna**: timeline na `StudentProfileSheet` com mensalidades dos ultimos N meses (hoje so mostra status do mes atual + flag `hasOverdueHistory`).
- **WhatsApp templates**: ja temos link `wa.me`, falta texto pre-preenchido por contexto (cobranca, lembrete aniversario, comunicado).
