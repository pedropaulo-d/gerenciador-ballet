// Maps Postgres/PostgREST errors to user-safe Portuguese messages.
// The raw error is logged server-side for debugging; the caller only
// receives a sanitized string, so we never leak table/column/constraint
// names to the client (information disclosure).

type DbError =
  | { code?: string | null; message?: string | null; details?: string | null; hint?: string | null }
  | null
  | undefined;

const CODE_MAP: Record<string, string> = {
  "23505": "Registro duplicado.",
  "23503": "Referencia invalida: verifique os vinculos do registro.",
  "23502": "Campo obrigatorio ausente.",
  "23514": "Valor fora das regras permitidas.",
  "22001": "Valor excede o tamanho permitido.",
  "22P02": "Formato de dado invalido.",
  "PGRST116": "Registro nao encontrado.",
  "42501": "Permissao negada.",
};

const DEFAULT_MESSAGE = "Operacao falhou. Tente novamente.";

export function safeDbError(error: DbError, context: string): string {
  if (error) {
    console.error(`[${context}]`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const mapped = error.code ? CODE_MAP[error.code] : undefined;
    if (mapped) return mapped;
  }
  return DEFAULT_MESSAGE;
}
