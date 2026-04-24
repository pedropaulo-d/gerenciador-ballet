export default function StudentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-md bg-muted animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 rounded-md bg-muted animate-pulse" />
        <div className="h-10 w-full sm:w-40 rounded-md bg-muted animate-pulse" />
        <div className="h-10 w-full sm:w-40 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Count line */}
      <div className="h-3 w-36 rounded bg-muted/60 animate-pulse" />

      {/* Table rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-md border border-gold/20 bg-card animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
