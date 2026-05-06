import { z } from "zod";

// Schemas Zod compartilhados entre Server Actions (students.ts,
// import-students.ts). Vivem fora de `app/actions/` porque arquivos
// com diretiva "use server" so podem exportar async functions —
// constantes/objetos quebram o build do Next.js 16.

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const studentInsertSchema = z.object({
  full_name: z.string().trim().min(1, "Nome obrigatorio.").max(200),
  birth_date: isoDateSchema.nullish(),
  guardian_name: z.string().trim().min(1, "Nome do responsavel obrigatorio.").max(200),
  guardian_phone: z.string().max(30).nullish(),
  guardian_email: z.string().email().max(200).nullish().or(z.literal("")).transform(v => v || null),
  guardian_cpf: z.string().max(20).nullish(),
  is_internal: z.boolean(),
  notes: z.string().max(2000).nullish(),
  is_active: z.boolean(),
});
