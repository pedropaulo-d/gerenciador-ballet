export default function FinancesLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Month selector */}
      <div className="h-12 rounded-md bg-muted/50 animate-pulse" />

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 rounded-md bg-muted animate-pulse" />
        <div className="h-10 flex-1 rounded-md bg-muted animate-pulse" />
        <div className="h-10 flex-1 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Summary — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border-2 border-primary/20 bg-card animate-pulse"
          />
        ))}
      </div>

      {/* Fees table rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-md border border-primary/20 bg-card animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
