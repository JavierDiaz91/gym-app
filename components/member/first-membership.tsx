import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, Dumbbell, User } from "lucide-react";

export function FirstMembership({ name, gymName, dashboard = false, directCheckout }: { name: string; gymName: string; dashboard?: boolean; directCheckout: boolean }) {
  const steps = [
    { icon: CheckCircle2, title: "Cuenta creada", detail: "Tu registro está completo." },
    { icon: CreditCard, title: "Elegí tu plan", detail: directCheckout ? "Elegí y completá el pago disponible." : "Solicitá tu plan al gimnasio." },
    { icon: Dumbbell, title: "Empezá a entrenar", detail: "Accedé a tus rutinas cuando se active tu plan." },
  ];
  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{dashboard ? `¡Bienvenido, ${name}! 👋` : "Mi primera membresía"}</h1>
      <p className="text-sm text-muted-foreground">Tu cuenta ya está vinculada a {gymName}.</p>
    </header>
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-8 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-fit rounded-xl bg-primary/10 p-4 text-primary"><Dumbbell className="size-8" /></div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold sm:text-2xl">¡Empezá tu entrenamiento!</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Elegí tu primera membresía y comenzá a disfrutar de los beneficios de tu gimnasio. {directCheckout ? "Tu plan se habilitará cuando se confirme el pago." : "Tu gimnasio confirmará la asignación y el pago."}</p>
        </div>
      </div>
      <Link href="/miembro/planes" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto">Elegir mi membresía <ArrowRight className="size-4" /></Link>
    </section>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Pasos para comenzar">
      {steps.map(({icon: Icon,title,detail}, i) => <div key={title} className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between"><Icon className={i === 2 ? "size-6 text-muted-foreground" : "size-6 text-primary"} /><span className="text-xs text-muted-foreground">Paso {i+1}</span></div>
        <h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{detail}</p>
      </div>)}
    </section>
    {dashboard && <section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="flex items-center gap-2 font-semibold"><Dumbbell className="size-5 text-primary"/> Mis rutinas de entrenamiento</h2>
      <p className="text-sm text-muted-foreground">Una vez que actives tu membresía, podrás acceder a las rutinas que te asigne tu entrenador.</p>
      <Link href="/miembro/perfil" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><User className="size-4"/> Gestionar mi perfil</Link>
    </section>}
  </div>;
}
