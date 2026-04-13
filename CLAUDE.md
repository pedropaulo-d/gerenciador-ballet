# Petit Allegro Manager — V1 CONCLUÍDA

Sistema de gestao para escola de ballet itinerante que atua dentro de creches e escolas particulares.

**Status:** V1 completa e funcional (lançamento abril 2026).

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **UI:** Tailwind CSS 4 + shadcn/ui 4 — tema "Teatro Português" (rosa ballet + ouro + ivory + damask)
- **Backend:** Supabase (PostgreSQL, Auth, RLS) — `service_role` em Server Actions, `anon` key so no client
- **Integracoes:** API Asaas (webhooks de pagamento)

## Arquitetura

```
src/
├── app/
│   ├── actions/               # Server Actions ("use server") — retornam ActionResult<T>
│   │   ├── locations.ts       # CRUD locations
│   │   ├── classes.ts         # CRUD classes (filtro por location)
│   │   ├── students.ts        # CRUD students + enrollment + busca paginada
│   │   ├── financial.ts       # Mensalidades: listagem, geracao lote, baixa, undo, overdue
│   │   ├── attendance.ts      # Chamada: busca turma+data, upsert lote
│   │   ├── student-profile.ts # Perfil 360 + getTodayAbsencesCount
│   │   ├── dashboard.ts       # getTodayBirthdays
│   │   └── import-students.ts # Importacao CSV com matching fuzzy
│   ├── api/webhooks/asaas/    # Webhook POST Asaas (token validation)
│   ├── (dashboard)/           # Route group (header + bottom nav + sheet "Mais")
│   │   ├── dashboard-home.tsx # Home: aniversarios, metricas, resumo financeiro
│   │   ├── layout.tsx         # Header + BottomNav + Sheet "Mais"
│   │   ├── locations/         # CRUD locais
│   │   ├── classes/           # CRUD turmas (filtro por local)
│   │   ├── students/          # CRUD alunas + perfil 360
│   │   ├── finances/          # Financeiro paginado com filtros
│   │   ├── attendance/        # Chamada mobile-first
│   │   └── import/            # Importacao CSV
│   ├── layout.tsx             # Root (Toaster, fonts: Playfair Display + Inter)
│   └── globals.css            # Tema Teatro Português (oklch, damask SVG, gold utils)
├── components/
│   ├── ui/                    # shadcn/ui + pagination-controls + delete-dialog
│   ├── locations/             # form, table, form-dialog, delete-dialog
│   ├── classes/               # form, table, form-dialog, delete-dialog
│   ├── students/              # form, table, form-dialog, delete-dialog, filters, profile-sheet
│   ├── dashboard/             # birthday-card, dashboard-metrics, dashboard-financial
│   ├── financial/             # month-selector, filters, summary, fees-table, pay-fee-dialog
│   └── attendance/            # attendance-list
├── lib/
│   ├── supabase.ts            # Clients: anon (public) + service_role (server)
│   ├── action-result.ts       # ActionResult<T> type
│   ├── formatters.ts          # Moeda, datas, labels, timezone Brasilia
│   ├── use-url-params.ts      # Hook filtros via URL search params
│   └── utils.ts               # cn()
├── types/database.ts          # Tipagens do banco + Insert/Update/Join types
supabase/schema.sql            # Script SQL completo (6 tabelas, RLS, triggers, GIN)
```

## Banco de Dados (6 tabelas)

| Tabela | Descricao |
|---|---|
| `locations` | Escolas parceiras. `fee_per_student` (taxa R$/aluna) |
| `classes` | Turmas. `days_of_week` (smallint[]) + horario |
| `students` | Alunas + responsavel, `is_internal`, `medical_notes`, `internal_observations` |
| `enrollments` | student ↔ class. Status, validade, `base_fee`, `due_day` (5 ou 7) |
| `monthly_fees` | Mensalidades. `net_amount` (gerada = gross - asaas_fee - location_fee) |
| `attendance` | Chamada diaria. present/absent/justified. Unique (enrollment_id, date) |

## Identidade Visual — Tema "Teatro Português"

- **Paleta:** Rosa ballet (primary), ouro envelhecido (--gold), marfim quente (background)
- **Tipografia:** Roboto (400/500/700) — fonte unica para todo o sistema
- **Background:** Damask SVG pattern (opacity 4%)
- **Cards:** Bordas douradas sutis, sombras quentes
- **Dark mode:** Definido no CSS mas nao ativado (sem ThemeProvider)

## Regras de Negocio

1. Aulas em creches/escolas parceiras — cada local cobra taxa fixa/aluna
2. Turmas pertencem a um local, multiplos dias/semana
3. Matriculas: active/inactive/pending, validade semester/annual, due_day 5 ou 7
4. Financeiro: valor bruto no app, descontos/juros do Asaas, conciliacao via webhook
5. Mensalidades geradas em lote (idempotente), overdue automatico, baixa manual + undo
6. Webhook Asaas: PAYMENT_RECEIVED/CONFIRMED/OVERDUE/DELETED/REFUNDED
7. Chamada mobile-first: 3 status com toggle, upsert em lote
8. Perfil 360: dados pessoais, matricula, observacoes, financeiro, frequencia, WhatsApp
9. Dashboard: aniversariantes, metricas (locais/turmas/faltas), resumo financeiro do mes
10. Status financeiro: pendente=laranja, pago=verde, vencido=vermelho, cancelado=cinza

## Padrao por Modulo

1. **Server Actions** (`actions/*.ts`): Supabase queries, retornam `ActionResult<T>`, try/catch
2. **Componentes** (`components/`): UI pura, props + callbacks, sem Server Actions
3. **Pagina/List** (`(dashboard)/`): Client component orquestrando estado, dialogs, actions, toasts

## Navegacao

- **Header:** Logo "Petit Allegro" + icone flor-de-lis dourada
- **Bottom Nav (5):** Inicio, Chamada, Alunas, Financeiro, Mais
- **Sheet "Mais":** Turmas, Locais, Importar Alunas

## Diretrizes

- TypeScript strict, componentes funcionais, React Hooks
- Mobile-first, minimalista
- Alias `@/*` → `src/*`
- Alteracoes no banco: atualizar `supabase/schema.sql` + `types/database.ts`
- Feedback obrigatorio: `toast.success` / `toast.error` em toda operacao de escrita
- Seguranca: chaves via `process.env`, RLS habilitado (endurecer apos Auth)

## Comandos

```bash
npm run dev    # Dev server
npm run build  # Build producao
npm run lint   # ESLint
```

## Pendencias para V2

- [ ] Autenticacao (Supabase Auth) + endurecer RLS
- [ ] Dark mode (tema CSS ja definido, falta ThemeProvider)
- [ ] PWA / Service Worker para uso offline
- [ ] Relatorios e exportacao (PDF/Excel)
- [ ] Notificacoes push (lembrete de aula, cobranca)
