# Projeto: Petit Allegro Manager

Um sistema de gestão para uma escola de ballet itinerante que atua dentro de creches e escolas particulares.

## Stack Tecnológico

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Estilização:** Tailwind CSS 4 + shadcn/ui 4
- **Backend/Database:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Integrações futuras:** API Asaas (Webhooks de pagamento), API Google Sheets (orçamento pessoal)

## Estrutura do Projeto

```
src/
├── app/
│   ├── actions/               # Server Actions (camada de serviço)
│   │   ├── locations.ts       # CRUD locations
│   │   ├── classes.ts         # CRUD classes (filtro por location)
│   │   ├── students.ts        # CRUD students + criação unificada student+enrollment
│   │   ├── financial.ts       # Listagem paginada, geração de mensalidades, baixa manual, desfazer pagamento, lógica de overdue, filtros
│   │   ├── attendance.ts      # Busca chamada por turma+data, salvamento em lote (upsert)
│   │   ├── student-profile.ts # getStudentSummary (perfil 360°) + getTodayAbsencesCount
│   │   ├── dashboard.ts       # getTodayBirthdays (aniversariantes do dia)
│   │   └── import-students.ts # Importação CSV com matching fuzzy de turmas
│   ├── api/
│   │   └── webhooks/
│   │       └── asaas/
│   │           └── route.ts   # Webhook POST Asaas (pagamentos)
│   ├── (dashboard)/           # Route group com layout (header + fixed 5-item bottom nav + sheet "Mais")
│   │   ├── page.tsx           # Dashboard home (/)
│   │   ├── dashboard-home.tsx # Client component do dashboard (aniversarios + stats + faltas hoje)
│   │   ├── layout.tsx
│   │   ├── locations/
│   │   │   ├── page.tsx
│   │   │   └── location-list.tsx
│   │   ├── classes/
│   │   │   ├── page.tsx
│   │   │   └── class-list.tsx
│   │   ├── students/
│   │   │   ├── page.tsx
│   │   │   └── student-list.tsx
│   │   ├── finances/
│   │   │   ├── page.tsx
│   │   │   └── finances-list.tsx
│   │   ├── attendance/
│   │   │   ├── page.tsx
│   │   │   └── attendance-manager.tsx
│   │   └── import/
│   │       └── page.tsx
│   ├── layout.tsx             # Root layout (Toaster, fonts)
│   ├── page.tsx               # (removido — dashboard é servido pelo route group)
│   └── globals.css
├── components/
│   ├── ui/                    # Componentes shadcn/ui (não editar manualmente)
│   ├── locations/
│   │   ├── location-form.tsx
│   │   ├── locations-table.tsx
│   │   ├── location-form-dialog.tsx
│   │   └── location-delete-dialog.tsx
│   ├── classes/
│   │   ├── class-form.tsx
│   │   ├── class-form-dialog.tsx
│   │   └── class-delete-dialog.tsx
│   ├── students/
│   │   ├── student-form.tsx
│   │   ├── students-table.tsx
│   │   ├── student-form-dialog.tsx
│   │   ├── student-delete-dialog.tsx
│   │   ├── student-filters.tsx
│   │   ├── student-pagination.tsx
│   │   └── student-profile-sheet.tsx  # Sheet 360° (perfil, financeiro, frequência, WhatsApp)
│   ├── dashboard/
│   │   └── birthday-card.tsx  # Card de aniversariantes do dia
│   ├── financial/
│   │   ├── month-selector.tsx
│   │   ├── financial-filters.tsx
│   │   ├── financial-summary.tsx
│   │   ├── fees-table.tsx
│   │   ├── fees-pagination.tsx
│   │   └── pay-fee-dialog.tsx
│   └── attendance/
│       └── attendance-list.tsx
├── lib/
│   ├── supabase.ts            # Client Supabase (NEXT_PUBLIC_ vars)
│   ├── action-result.ts       # Tipo ActionResult<T> compartilhado
│   ├── formatters.ts          # formatCurrency, DAY_LABELS, sortedDays, validityLabel, formatTime
│   └── utils.ts               # cn() e utilitários gerais
├── types/
│   └── database.ts            # Tipagens do banco de dados + Insert/Update/Join types
supabase/
└── schema.sql                 # Script SQL completo do banco
```

### Status dos Módulos

| Módulo | Status |
|---|---|
| Locais (CRUD) | Concluído |
| Turmas (CRUD + filtro por local) | Concluído |
| Alunas (CRUD + busca + filtros + paginação + perfil 360°) | Concluído |
| Dashboard (stats, financeiro do mês, faltas hoje) | Concluído |
| Importação CSV | Concluído |
| Financeiro (mensalidades, paginação, baixa manual, overdue automático) | Concluído |
| Webhook Asaas | Estrutura pronta (validação de token pendente) |
| Chamada (Frequência: presença, falta, justificada) | Concluído |

## Banco de Dados — Esquema

6 tabelas principais, todas com UUID como PK e timestamps automáticos:

| Tabela | Descrição |
|---|---|
| `locations` | Escolas/creches parceiras. `fee_per_student` (valor fixo em R$ por aluna) |
| `classes` | Turmas vinculadas a um location. `days_of_week` (smallint[], múltiplos dias) + horário |
| `students` | Alunas com dados do responsável, flag `is_internal`, `medical_notes` e `internal_observations` |
| `enrollments` | Liga student ↔ class, com status, validade, `base_fee` (valor base da mensalidade) e `due_day` (dia de vencimento: 5 ou 7) |
| `monthly_fees` | Mensalidades com taxa Asaas, taxa do local e `net_amount` (coluna gerada) |
| `attendance` | Chamada diária. Status: `present`, `absent`, `justified`. Unique em `(enrollment_id, date)` |

- Trigger automático de `updated_at` em todas as tabelas.
- Índices GIN (`pg_trgm`) em `students` para busca textual parcial (ILIKE) nas colunas `full_name`, `guardian_name`, `guardian_phone` e `guardian_cpf`.
- RLS habilitado com políticas temporárias (ajustar após configurar Auth).
- Script completo: `supabase/schema.sql`

## Regras de Negócio e Domínio

1. **Locais/Parceiros:** A escola não tem sede física. As aulas ocorrem em "Locais" (creches, escolas particulares). Cada Local possui uma "Taxa de Repasse por Aluna" (valor fixo em R$, ex: R$ 20,00) que é cobrada por aluna matriculada e deduzida do faturamento.
2. **Alunas e Turmas:** Alunas são matriculadas em Turmas. Uma Turma pertence a um Local e pode ter aulas em múltiplos dias da semana. Alunas podem ser internas (da própria creche) ou externas. A listagem de turmas deve sempre ser contextualizada por Local (filtro Select) para evitar ambiguidade entre nomes repetidos.
3. **Matrículas:** Possuem status (active, inactive, pending), tipo de validade (semester, annual) e dia de vencimento (`due_day`: 5 ou 7). Os pais escolhem entre dia 05 ou 07 de cada mês.
4. **Financeiro:** O app registra apenas o Valor Base bruto da mensalidade (`base_fee` em enrollments). O cálculo de descontos (ex: 10% até o vencimento) e juros é responsabilidade exclusiva do Asaas. O app concilia o valor líquido recebido via webhook. Coluna `net_amount` em `monthly_fees` é gerada automaticamente (gross - asaas_fee - location_fee). Mensalidades são geradas em lote por mês via `generateFeesForMonth()`. Mensalidades pendentes são automaticamente marcadas como "overdue" quando a data atual ultrapassa o `due_day` do mês de referência. Baixa manual disponível via `payFeeManually()`. **Desfazer pagamento** via `undoPayment()` reverte status para 'pending' e zera `paid_at`, `asaas_fee` e `location_fee`. Filtros avançados por status, local e turma via URL search params.
   - **Cores de status:** Pendente = Laranja (warning), Pago = Verde (success), Vencido = Vermelho (destructive), Cancelado = Cinza (secondary).
5. **Webhooks Asaas:** Tratados nativamente pelo App Router em `src/app/api/webhooks/asaas/route.ts` (POST). Eventos suportados: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`. O webhook atualiza `monthly_fees.status`, `asaas_fee` e `paid_at`.
6. **Chamada (Frequência):** Mobile-First, focada em toques rápidos. Seletores de data (padrão hoje) e turma no topo. Lista de alunas com 3 botões circulares por linha: Presente (verde), Falta (vermelho), Justificada (amarelo). Toggle: clicar no mesmo status desmarca. Salvamento em lote via `saveAttendance()` (upsert por `enrollment_id + date`). Tabela `attendance` com constraint unique `(enrollment_id, date)`. Campo `justification` (text, nullable) para motivo de falta justificada.
7. **Perfil 360° da Aluna:** Sheet lateral (`student-profile-sheet.tsx`) acessado via clique no nome da aluna ou botão "Ver Perfil" na tabela. Consolida: dados pessoais, matrícula atual (turma + local), **observações importantes** (médicas e pedagógicas), status financeiro do mês + histórico de inadimplência, frequência do mês (P/F/J), contato do responsável com link clicável para WhatsApp (`wa.me/55...`). Dados via `getStudentSummary()`.
8. **Dashboard:** Home (`/`) com **alerta de aniversariantes** (card rosa no topo, só aparece se houver), cards de Locais, Turmas e **Faltas Hoje** (com destaque visual vermelho se > 0), resumo financeiro do mês (recebido, pendente, vencido), link rápido para financeiro completo. Aniversários via `getTodayBirthdays()`, faltas via `getTodayAbsencesCount()`.

## Arquitetura — Padrão para CRUDs

Cada módulo (locations, students, classes, etc.) segue esta estrutura em 3 camadas:

1. **Server Actions** (`src/app/actions/<entidade>.ts`): Toda comunicação com Supabase. Marcados com `"use server"`. Retornam `ActionResult<T>` (`{ success, data }` ou `{ success, error }`). Envolvem chamadas em try/catch.
2. **Componentes de domínio** (`src/components/<entidade>/`): Formulários e peças reutilizáveis. Recebem dados via props e disparam callbacks (`onSubmit`). Não conhecem Server Actions diretamente.
3. **Página/List** (`src/app/(dashboard)/<entidade>/`): Client component que orquestra estado, dialogs e chama as Server Actions. Exibe feedback via `toast` (sonner).

## Navegação

- **Header (Top):** Logo "Petit Allegro" como link para Home (`/`).
- **Bottom Nav (Fixed, 5 itens):** Inicio (`/`), Chamada (`/attendance`), Alunas (`/students`), Financeiro (`/finances`), Mais.
- **Menu "Mais":** Sheet (bottom) com links secundários: Turmas (`/classes`), Locais (`/locations`), Importar Alunas (`/import`).
- Botão "Importar" também acessível no header da página `/students` ao lado de "Nova Aluna".

## Diretrizes de Código

- Escreva código TypeScript limpo e tipado.
- Priorize componentes funcionais e React Hooks.
- Mantenha a interface minimalista e focada na usabilidade pelo celular.
- Use o alias `@/*` para imports (mapeado para `src/*`).
- Sempre que criar/alterar tabelas no Supabase, atualize `supabase/schema.sql` e `src/types/database.ts`.
- Estruture o banco priorizando normalização, mas facilitando consultas de relatórios financeiros mensais.
- Feedback visual obrigatório: use `toast.success` / `toast.error` (sonner) em toda operação de escrita.

## Comandos

```bash
npm run dev    # Servidor de desenvolvimento
npm run build  # Build de produção
npm run lint   # ESLint
```
