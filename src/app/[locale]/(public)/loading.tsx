export default function PublicLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse" aria-busy="true">
      <div className="h-8 w-56 bg-muted rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
