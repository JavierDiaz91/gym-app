import { getMemberWorkoutHistory, getSession } from "@/app/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TrainerSecurityTestPage() {
  const session = await getSession();

  if (!session || session.role !== "trainer") {
    redirect("/login");
  }

  const history = await getMemberWorkoutHistory(8);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Prueba de aislamiento trainer</h1>
      <p className="text-sm text-muted-foreground">
        Trainer autenticado: usuario #{session.id} · gym #{session.gymId}
      </p>

      <div className="border rounded-xl p-4 bg-card">
        <p className="font-semibold mb-2">
          Resultado de getMemberWorkoutHistory(8):
        </p>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(history, null, 2)}
        </pre>
      </div>

      <p className="text-sm">
        Resultado esperado para un trainer del Gym 1 consultando al miembro 8 del Gym 2: []
      </p>
    </div>
  );
}
