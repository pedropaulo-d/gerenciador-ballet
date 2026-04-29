export default function LocationsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-primary/20 bg-card animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
