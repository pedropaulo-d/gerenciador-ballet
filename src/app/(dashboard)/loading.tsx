export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-10">
      {/* Header skeleton */}
      <div>
        <div className="h-10 w-56 sm:h-14 sm:w-72 rounded-md bg-muted animate-pulse" />
        <div className="mt-3 h-4 w-32 rounded bg-muted/60 animate-pulse" />
      </div>

      {/* Metrics skeleton (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 sm:h-32 rounded-xl border-2 border-primary/20 bg-card animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
