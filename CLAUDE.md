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
│   ├── actions/          # Server Actions (camada de serviço)
│   │   ├── locations.ts  # CRUD Supabase para locations
│   │   ├── classes.ts    # CRUD Supabase para classes (filtro por location)
│   │   └── students.ts   # CRUD students + criação unificada student+enrollment
│   ├── (dashboard)/      # Route group com layout (header + nav)
│   │   ├── layout.tsx
│   │   ├── locations/
│   │   │   ├── page.tsx
│   │   │   └── location-list.tsx
│   │   └── students/
│   │       ├── page.tsx
│   │       └── student-list.tsx
│   ├── layout.tsx        # Root layout (Toaster, fonts)
│   ├── page.tsx          # Redirect → /locations
│   └── globals.css
├── components/
│   ├── ui/               # Componentes shadcn/ui (não editar manualmente)
│   ├── locations/        # Componentes de domínio
│   │   └── location-form.tsx
│   ├── classes/
│   │   └── class-form.tsx
│   └── students/
│       ├── student-form.tsx
│       └── students-table.tsx
├── lib/
│   ├── supabase.ts       # Client Supabase (NEXT_PUBLIC_ vars)
│   └── utils.ts          # Utilitários (cn, etc.)
├── types/
│   └── database.ts       # Tipagens do banco de dados
supabase/
└── schema.sql            # Script SQL completo do banco
```

## Banco de Dados — Esquema

5 tabelas principais, todas com UUID como PK e timestamps automáticos:

| Tabela | Descrição |
|---|---|
| `locations` | Escolas/creches parceiras. `fee_per_student` (valor fixo em R$ por aluna) |
| `classes` | Turmas vinculadas a um location. `days_of_week` (smallint[], múltiplos dias) + horário |
| `students` | Alunas com dados do responsável e flag `is_internal` |
| `enrollments` | Liga student ↔ class, com status, validade e `base_fee` (valor base da mensalidade) |
| `monthly_fees` | Mensalidades com taxa Asaas, taxa do local e `net_amount` (coluna gerada) |

- Trigger automático de `updated_at` em todas as tabelas.
- Índices GIN (`pg_trgm`) em `students` para busca textual parcial (ILIKE) nas colunas `full_name`, `guardian_name`, `guardian_phone` e `guardian_cpf`.
- RLS habilitado com políticas temporárias (ajustar após configurar Auth).
- Script completo: `supabase/schema.sql`

## Regras de Negócio e Domínio

1. **Locais/Parceiros:** A escola não tem sede física. As aulas ocorrem em "Locais" (creches, escolas particulares). Cada Local possui uma "Taxa de Repasse por Aluna" (valor fixo em R$, ex: R$ 20,00) que é cobrada por aluna matriculada e deduzida do faturamento.
2. **Alunas e Turmas:** Alunas são matriculadas em Turmas. Uma Turma pertence a um Local e pode ter aulas em múltiplos dias da semana. Alunas podem ser internas (da própria creche) ou externas. A listagem de turmas deve sempre ser contextualizada por Local (filtro Select) para evitar ambiguidade entre nomes repetidos.
3. **Matrículas:** Possuem status (active, inactive, pending) e tipo de validade (semester, annual).
4. **Financeiro:** O app registra apenas o Valor Base bruto da mensalidade (`base_fee` em enrollments). O cálculo de descontos (ex: 10% até o vencimento) e juros é responsabilidade exclusiva do Asaas. O app apenas conciliará o valor líquido recebido via webhook. Coluna `net_amount` em `monthly_fees` é gerada automaticamente (gross - asaas_fee - location_fee).
5. **Chamada (Frequência):** Deve ser estritamente Mobile-First, focada em toques rápidos na tela para marcar presença da turma no dia.

## Arquitetura — Padrão para CRUDs

Cada módulo (locations, students, classes, etc.) segue esta estrutura em 3 camadas:

1. **Server Actions** (`src/app/actions/<entidade>.ts`): Toda comunicação com Supabase. Marcados com `"use server"`. Retornam `ActionResult<T>` (`{ success, data }` ou `{ success, error }`). Envolvem chamadas em try/catch.
2. **Componentes de domínio** (`src/components/<entidade>/`): Formulários e peças reutilizáveis. Recebem dados via props e disparam callbacks (`onSubmit`). Não conhecem Server Actions diretamente.
3. **Página/List** (`src/app/(dashboard)/<entidade>/`): Client component que orquestra estado, dialogs e chama as Server Actions. Exibe feedback via `toast` (sonner).

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
