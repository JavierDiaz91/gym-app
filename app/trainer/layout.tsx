import TrainerSidebar from "@/components/trainer/sidebar";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import ThemeToggleBar from "@/components/ui/ThemeToggleBar";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let trainerName = "";
  if (session?.role === "trainer" && session.gymId != null) {
    const rows = await sql`
      SELECT t.first_name, t.last_name
      FROM trainers t
      WHERE t.user_id = ${session.id} AND t.gym_id = ${session.gymId}
      LIMIT 1
    `;
    const trainer = rows[0];
    if (trainer) trainerName = [trainer.first_name, trainer.last_name].filter(Boolean).join(" ").trim();
  }
  const displayName = trainerName || session?.email || "Entrenador";
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground relative">
      {/* Sidebar preparado para ocultarse en celular y ser fijo en PC */}
      <TrainerSidebar displayName={displayName} />

      {/* Contenido principal con límites de ancho responsivos */}
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>

      {/* Barra flotante de cambio de tema */}
      <ThemeToggleBar />
    </div>
  );
}