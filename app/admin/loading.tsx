export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" />
        <span>Cargando panel del gimnasio...</span>
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
