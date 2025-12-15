export default function StudentLoading() {
  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-72 rounded bg-white/10 animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2 animate-pulse">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="h-6 w-16 rounded bg-white/20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4 animate-pulse">
            <div className="h-5 w-40 rounded bg-white/10" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-12 rounded bg-white/5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
