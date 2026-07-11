export default function AppLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse" aria-busy="true">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-xl" />
      <div className="h-40 bg-muted rounded-xl" />
    </div>
  )
}
