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
