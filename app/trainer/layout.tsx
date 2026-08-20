import TrainerSidebar from "@/components/trainer/sidebar";
import ThemeToggleBar from "@/components/ui/ThemeToggleBar";

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground relative">
      {/* Sidebar preparado para ocultarse en celular y ser fijo en PC */}
      <TrainerSidebar />

      {/* Contenido principal con límites de ancho responsivos */}
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>

      {/* Barra flotante de cambio de tema */}
      <ThemeToggleBar />
    </div>
  );
}