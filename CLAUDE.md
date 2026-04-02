# Projeto: Petit Allegro Manager
Um sistema de gestão para uma escola de ballet itinerante que atua dentro de creches e escolas particulares.

## Stack Tecnológico
- Frontend: Next.js (App Router), React, TypeScript.
- Estilização: Tailwind CSS e shadcn/ui.
- Backend/Database: Supabase (PostgreSQL, Auth e Row Level Security).
- Integrações futuras: API Asaas (Webhooks de pagamento), API Google Sheets (orçamento pessoal).

## Regras de Negócio e Domínio
1. **Locais/Parceiros:** A escola não tem sede física. As aulas ocorrem em "Locais" (creches, escolas particulares). Cada Local possui uma "Taxa de Repasse" (percentual ou valor fixo) que precisa ser deduzida do faturamento.
2. **Alunas e Turmas:** Alunas são matriculadas em Turmas. Uma Turma pertence a um Local. Alunas podem ser internas (da própria creche) ou externas.
3. **Matrículas:** Possuem status (Ativa, Inativa, Pendente) e tipo de validade (Semestral, Anual).
4. **Financeiro:** Os pagamentos são gerenciados via Asaas (mensalidades de março a dezembro). O sistema precisa calcular o valor líquido de cada mensalidade (Valor Bruto - Taxa Asaas - Taxa do Local) para envio futuro ao orçamento.
5. **Chamada (Frequência):** Deve ser estritamente Mobile-First, focada em toques rápidos na tela para marcar presença da turma no dia.

## Diretrizes de Código
- Escreva código TypeScript limpo e tipado.
- Priorize componentes funcionais e React Hooks.
- Mantenha a interface minimalista e focada na usabilidade pelo celular.
- Estruture o banco de dados priorizando a normalização, mas facilitando consultas de relatórios financeiros mensais.
- Sempre que criar tabelas no Supabase, forneça o script SQL correspondente.