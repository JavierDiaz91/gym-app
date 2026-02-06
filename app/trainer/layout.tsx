import Link from "next/link";

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-sidebar text-sidebar-foreground p-4">
        <nav className="space-y-2">
          <Link href="/trainer" className="block hover:underline">
            Dashboard
          </Link>

          <Link href="/trainer/alumnos" className="block hover:underline">
            Mis Alumnos
          </Link>

          <Link href="/trainer/rutinas" className="block hover:underline">
            Rutinas
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

