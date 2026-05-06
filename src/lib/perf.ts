/**
 * Mini-utilitário de instrumentação. Sem dependências externas (sem Datadog,
 * Sentry, Winston). Usa `performance.now()` do runtime e `console.log` —
 * basta `next dev` ou ler o stdout do servidor em produção para ver os
 * tempos. Para desligar, comentar a linha do log no fim do arquivo.
 *
 * Uso:
 *   const end = startPerf("getStudentsPaginated");
 *   try { ... } finally { end(); }
 */
export function startPerf(name: string): () => void {
  const start = performance.now();
  return () => {
    const ms = performance.now() - start;
    console.log(`[PERF] ${name}: ${ms.toFixed(2)} ms`);
  };
}

/**
 * Substitui UUIDs e sequências numéricas longas por `:id` para evitar
 * vazar identificadores de banco em logs. Hoje a app só tem rotas
 * estáticas em `(dashboard)/`, mas se uma rota dinâmica `/students/[id]`
 * for adicionada, esse helper mantém o log limpo automaticamente.
 */
export function redactPath(pathname: string): string {
  return pathname
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ":id")
    .replace(/\/\d{6,}(?=\/|$)/g, "/:id");
}
