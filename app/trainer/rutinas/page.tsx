// app/trainer/rutinas/page.tsx

import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function RutinasPage() {
  // 1️⃣ Obtener sesión (SERVER COMPONENT)
  const session = await getSession();

  if (!session || session.role !== "trainer") {
    return <p>No autorizado</p>;
  }

  // QUERY PARA OBTENER LAS RUTINAS DEL TRAINER 
  const routines = await sql`
  SELECT 
    r.id,
    r.title,
    r.description
  FROM routines r
  JOIN trainers t ON r.trainer_id = t.id
  WHERE t.user_id = ${session.id}
  ORDER BY r.created_at DESC
`;


  // Render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Rutinas</h1>
        <Button asChild>
          <Link href="/trainer/rutinas/nueva">Nueva Rutina</Link>
        </Button>
      </div>

      {routines.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no creaste rutinas
        </p>
      ) : (
        <ul className="space-y-2">
          {routines.map((r) => (
            <li key={r.id} className="border p-4 rounded">
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-muted-foreground">
                {r.description || "Sin descripción"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
