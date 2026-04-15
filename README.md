# Petit Allegro Manager

Sistema de gestao para escola de ballet itinerante que atua dentro de creches e escolas particulares. Focado em usabilidade mobile-first, controle financeiro integrado e gestao completa de alunas, turmas e chamadas.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| UI | Tailwind CSS 4 + shadcn/ui (Radix) — tema "Teatro Portugues", fonte Roboto |
| Backend | Supabase (PostgreSQL, Auth, RLS) com `@supabase/ssr` |
| Validacao | Zod 4 |
| Pagamentos | API Asaas (webhooks) |

## Features

### Autenticacao e RBAC (V2)

- Login seguro com Supabase Auth (email/password)
- Duas roles: **Administrador** (acesso total) e **Professora** (acesso restrito)
- Middleware server-side bloqueia rotas por role
- Server Actions validam permissao via `requireAuth()` / `requireAdmin()`
- Professora acessa: Home, Alunas e Chamadas
- Professora **nao** acessa: Financeiro, Turmas, Locais, metricas financeiras

### Gestao Financeira (Admin)

- Controle de mensalidades com geracao em lote (idempotente)
- Baixa manual com confirmacao editavel + undo
- Marcacao automatica de vencidos (overdue)
- Conciliacao via webhook Asaas (PAYMENT_RECEIVED, CONFIRMED, OVERDUE, DELETED, REFUNDED)
- Valor liquido calculado: bruto - taxa Asaas - taxa do local

### Gestao Escolar

- CRUD de locais (escolas parceiras) com taxa fixa por aluna
- CRUD de turmas vinculadas a locais, com dias da semana e horarios
- Matriculas: status (active/inactive/pending), validade (semester/annual), dia de vencimento (5 ou 7)
- Importacao de alunas via CSV com matching fuzzy

### Chamada

- Interface mobile-first com 3 status: presente, ausente, justificada
- Toggle rapido por aluna, upsert em lote
- Historico de faltas justificadas no perfil da aluna

### Perfil 360 da Aluna

- Dados pessoais, responsavel, observacoes medicas e internas
- Matricula ativa, historico financeiro (admin), frequencia
- Link direto para WhatsApp do responsavel
- Alertas de aniversario no dashboard

## Getting Started

### Pre-requisitos

- Node.js 18+
- Projeto Supabase configurado (Auth habilitado)
- Conta Asaas (opcional, para webhooks de pagamento)

### Variaveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...  # anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                      # service_role key (server-only)

# Asaas (opcional)
ASAAS_WEBHOOK_TOKEN=seu_token_webhook
```

> **Atencao:** a `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser prefixada com `NEXT_PUBLIC_`. Ela e usada apenas no servidor.

### Banco de dados

Antes de iniciar o sistema, execute as migrations SQL no **SQL Editor** do Supabase, na seguinte ordem:

1. `supabase/schema.sql` — cria as tabelas base (locations, classes, students, enrollments, monthly_fees, attendance)
2. `supabase/migrations/001_remove_anon_policies.sql` — remove politicas anon (seguranca)
3. `supabase/migrations/002_create_profiles_rbac.sql` — cria tabela `profiles`, enum `app_role`, trigger auto-create e RLS
4. `supabase/migrations/003_backfill_profiles.sql` — preenche profiles para usuarios existentes

Apos rodar as migrations, promova o usuario admin manualmente:

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Nome Admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@email.com');
```

### Instalacao

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O sistema estara disponivel em `http://localhost:3000`.

### Outros comandos

```bash
npm run build  # Build de producao
npm run lint   # ESLint
```

## Estrutura do Projeto

```
src/
├── app/
│   ├── actions/           # Server Actions (retornam ActionResult<T>)
│   ├── api/webhooks/      # Webhook Asaas
│   ├── login/             # Tela de login
│   └── (dashboard)/       # Route group principal (header + bottom nav)
├── components/
│   ├── ui/                # shadcn/ui
│   └── [modulo]/          # Componentes por dominio
├── lib/
│   ├── supabase.ts        # Client anon + service_role
│   ├── supabase-server.ts # Client SSR (@supabase/ssr)
│   ├── auth-guard.ts      # requireAuth(), requireAdmin()
│   └── ...                # Formatters, hooks, utils
├── types/
│   └── database.ts        # Tipagens do banco
supabase/
├── schema.sql             # Schema completo
└── migrations/            # Migrations incrementais
```

## Licenca

Projeto privado. Todos os direitos reservados.
