import { getMemberRoutine, getSession } from "@/app/actions";

export default async function RutinaPage() {
  const session = await getSession();
  if (!session) return <p>No autorizado</p>;

  const routine = await getMemberRoutine(session.id);

  if (!routine) {
    return <p>No tenés una rutina asignada</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{routine.name}</h1>
        {routine.description && (
          <p className="text-muted-foreground">{routine.description}</p>
        )}
      </div>

      {routine.exercises.map((ex) => (
        <div key={ex.id} className="border rounded p-4">
          <p className="font-medium">{ex.name}</p>
          <p className="text-sm text-muted-foreground">
            Día {ex.day} · {ex.sets} x {ex.reps}
          </p>
        </div>
      ))}
    </div>
  );
}
