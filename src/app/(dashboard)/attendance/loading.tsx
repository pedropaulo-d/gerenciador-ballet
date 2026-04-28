export default function AttendanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />

      {/* Date + class filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="h-10 rounded-md bg-muted animate-pulse" />
        <div className="h-10 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Count line */}
      <div className="h-3 w-32 rounded bg-muted/60 animate-pulse" />

      {/* Attendance cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-md border border-gold/20 bg-card animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
