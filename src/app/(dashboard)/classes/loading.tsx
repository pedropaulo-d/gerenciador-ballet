export default function ClassesLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Location filter */}
      <div className="h-10 w-full rounded-md bg-muted animate-pulse" />

      {/* Class cards skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-primary/20 bg-card animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
