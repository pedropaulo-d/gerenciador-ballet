# Petit Allegro Manager

Sistema de gestao para escola de ballet itinerante (creches e escolas parceiras).
V2 em producao (Auth + RBAC). V1 desde abril 2026.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **UI:** Tailwind CSS 4 + shadcn/ui 4 (Radix) + Zod 4
- **Backend:** Supabase (PostgreSQL, Auth, RLS, `@supabase/ssr`)
- **Integracoes:** API Asaas (webhooks de pagamento)
- **Alias:** `@/*` → `src/*`

## Regras Visuais (Obrigatorias)

- **Fonte unica:** Roboto (400/500/700). **Proibido** usar fontes serifadas (Playfair, Georgia, etc)
- **Tema "Teatro Portugues":** rosa ballet (primary), ouro envelhecido (--gold), marfim quente (background)
- **Background:** Damask SVG pattern (opacity 4%) via CSS
- **Cards:** Bordas douradas sutis, sombras quentes
- **Cores oklch** definidas em `globals.css` — dark mode definido no CSS mas nao ativado
- **Mobile-first obrigatorio:** grids fluidos, modais com `max-h` + `overflow-y-auto`
- Componentes Radix/shadcn exigem tags de acessibilidade (ex: `SheetTitle` invisivel se necessario)

## Arquitetura

```
src/
├── app/
│   ├── actions/               # Server Actions ("use server") — retornam ActionResult<T>
│   │   ├── auth.ts            # signIn, signOut, getUserProfile
│   │   ├── locations.ts       # CRUD locations
│   │   ├── classes.ts         # CRUD classes (filtro por location)
│   │   ├── students.ts        # CRUD students + enrollment + busca paginada
│   │   ├── financial.ts       # Mensalidades: listagem, geracao lote, baixa, undo, overdue
│   │   ├── attendance.ts      # Chamada: busca turma+data, upsert lote
│   │   ├── student-profile.ts # Perfil 360 + getTodayAbsencesCount (RBAC)
│   │   ├── dashboard.ts       # getTodayBirthdays, metricas
│   │   └── import-students.ts # Importacao CSV com matching fuzzy
│   ├── api/webhooks/asaas/    # Webhook POST Asaas (token validation)
│   ├── login/                 # Tela de login (Zod validation)
│   └── (dashboard)/           # Route group (header + bottom nav + sheet "Mais")
├── components/
│   ├── ui/                    # shadcn/ui (avatar, badge, button, card, dialog, dropdown-menu, etc)
│   ├── user-nav.tsx           # Avatar + dropdown com nome/role + logout
│   └── [modulo]/              # locations, classes, students, dashboard, financial, attendance
├── lib/
│   ├── supabase.ts            # anon client (browser) + getServiceSupabase() (service_role, server-only)
│   ├── supabase-server.ts     # createClient() — SSR client (anon + cookies, @supabase/ssr)
│   ├── supabase-middleware.ts # createMiddlewareClient() — middleware client (anon + cookies)
│   ├── auth-guard.ts          # requireAuth(), requireAdmin(), handleAuthError()
│   ├── user-role-context.tsx  # UserRoleProvider + useIsAdmin/useUserProfile hooks
│   ├── action-result.ts       # ActionResult<T> type
│   ├── formatters.ts          # Moeda, datas, labels, timezone Brasilia
│   └── use-url-params.ts      # Hook filtros via URL search params
├── types/database.ts          # Tipagens do banco + Insert/Update/Join types (AppRole, Profile)
supabase/
├── schema.sql                 # Schema SQL completo (7 tabelas, RLS, triggers, GIN)
└── migrations/                # Migrations incrementais
```

## Auth & RBAC

### Tres clientes Supabase (nunca confundir)
| Cliente | Arquivo | Uso |
|---|---|---|
| `createClient()` | `supabase-server.ts` | SSR: auth.getUser() em Server Actions (anon + cookies) |
| `getServiceSupabase()` | `supabase.ts` | Server Actions: queries de dados (service_role, bypassa RLS) |
| `createMiddlewareClient()` | `supabase-middleware.ts` | Middleware: refresh de sessao |

### Fluxo de autorizacao
1. **Middleware** (`middleware.ts`): redireciona nao-autenticados para `/login`, bloqueia rotas admin-only
2. **auth-guard.ts**: `requireAuth()` retorna `{userId, role}`, `requireAdmin()` exige role admin
3. **Server Actions**: chamam `requireAuth()`/`requireAdmin()` no inicio, usam `getServiceSupabase()` para dados
4. **Client**: `UserRoleProvider` expoe `useIsAdmin()` / `useUserProfile()` para RBAC visual

### Roles
- **admin:** acesso total
- **teacher:** acesso restrito — Home (sem metricas financeiras), Alunas (sem historico financeiro), Chamadas
- **Teacher NAO acessa:** `/finances`, `/locations`, `/classes`, `/admin`
- **Default ao criar usuario:** `teacher` (seguranca por padrao)

## Banco de Dados (7 tabelas)

| Tabela | Descricao |
|---|---|
| `profiles` | Extensao de auth.users. `role` (app_role: admin/teacher). Trigger auto-create |
| `locations` | Escolas parceiras. `fee_per_student` (taxa R$/aluna) |
| `classes` | Turmas. `days_of_week` (smallint[]) + horario. FK location |
| `students` | Alunas + responsavel, `is_internal`, `medical_notes`, `internal_observations` |
| `enrollments` | student <> class. Status (active/inactive/pending), `base_fee`, `due_day` (5 ou 7) |
| `monthly_fees` | Mensalidades. `net_amount` = gross - asaas_fee - location_fee |
| `attendance` | Chamada diaria. present/absent/justified. Unique (enrollment_id, date) |

## Regras de Negocio

1. Aulas em creches/escolas parceiras — cada local cobra taxa fixa/aluna
2. Turmas pertencem a um local, multiplos dias/semana
3. Matriculas: active/inactive/pending, validade semester/annual, due_day 5 ou 7
4. Mensalidades geradas em lote (idempotente), overdue automatico, baixa manual + undo
5. Webhook Asaas: PAYMENT_RECEIVED/CONFIRMED/OVERDUE/DELETED/REFUNDED
6. Chamada mobile-first: 3 status com toggle, upsert em lote
7. Perfil 360: dados pessoais, matricula, observacoes, financeiro, frequencia, WhatsApp
8. Dashboard: aniversariantes, metricas (locais/turmas/faltas), resumo financeiro (admin)
9. Status financeiro: pendente=laranja, pago=verde, vencido=vermelho, cancelado=cinza

## Navegacao

- **Header:** Logo "Petit Allegro" + UserNav (avatar + dropdown logout)
- **Bottom Nav:** Inicio, Chamada, Alunas + Financeiro (admin only) + Mais
- **Sheet "Mais":** Turmas (admin), Locais (admin), Importar Alunas

## Padroes de Codigo

### Server Actions (`actions/*.ts`)
- Retornam `ActionResult<T>`, try/catch com `handleAuthError()`
- Validacao com Zod em inputs de usuario
- Chamam `requireAuth()` ou `requireAdmin()` antes de qualquer operacao
- Queries via `getServiceSupabase()` (service_role)

### Componentes (`components/`)
- UI pura: props + callbacks, sem Server Actions diretas
- Tags de acessibilidade obrigatorias em Radix/shadcn

### Paginas (`(dashboard)/`)
- Client components orquestrando estado, dialogs, actions, toasts
- `toast.success` / `toast.error` em toda operacao de escrita

### Geral
- TypeScript strict, componentes funcionais, React Hooks
- Alteracoes no banco: atualizar `supabase/schema.sql` + `types/database.ts`
- Chaves via `process.env`, nunca expor service_role no client

## Comandos

```bash
npm run dev    # Dev server
npm run build  # Build producao
npm run lint   # ESLint
```

## Pendencias (V3+)

- Dark mode (tema CSS ja definido, falta ThemeProvider)
- PWA / Service Worker para uso offline
- Relatorios e exportacao (PDF/Excel)
- Notificacoes push (lembrete de aula, cobranca)
