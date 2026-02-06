import { getTrainerMembers } from "@/app/actions";

export default async function TrainerAlumnosPage({
  params,
}: {
  params: { id: string };
}) {
  const trainerId = Number(params.id);
  const members = await getTrainerMembers(trainerId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alumnos asignados</h1>

      {members.length === 0 ? (
        <p className="text-muted-foreground">
          Este entrenador no tiene alumnos asignados
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((m: any) => (
            <li
              key={m.id}
              className="border rounded-md p-4 flex justify-between"
            >
              <div>
                <p className="font-medium">
                  {m.first_name} {m.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{m.email}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
