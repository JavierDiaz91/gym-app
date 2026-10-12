export default function CuentaSuspendidaPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-card border border-border p-8 rounded-2xl max-w-md shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold">
          ðŸš«
        </div>
        <h1 className="text-xl font-bold text-foreground">Gimnasio Suspendido</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          El acceso a este panel ha sido suspendido temporalmente por cuestiones administrativas o de suscripciÃ³n.
        </p>
        <div className="pt-2">
          <a
            href="#"
            className="inline-block bg-[#00aeef] text-black font-bold text-xs px-4 py-2 rounded-xl"
          >
            Contactar a Soporte Kivra
          </a>
        </div>
      </div>
    </div>
  );
}
