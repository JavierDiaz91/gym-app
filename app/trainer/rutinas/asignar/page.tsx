"use client";

import { useEffect, useState } from "react";
import { assignRoutineToMember, getTrainerMembers, getTrainerRoutines } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AsignarRutinaPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [memberId, setMemberId] = useState("");
  const [routineId, setRoutineId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      const sessionRes = await fetch("/api/session");
      const session = await sessionRes.json();

      const m = await getTrainerMembers(session.id);
      const r = await getTrainerRoutines(session.id);

      setMembers(m);
      setRoutines(r);
    }

    loadData();
  }, []);

  async function handleAssign() {
    setMessage("");

    const sessionRes = await fetch("/api/session");
    const session = await sessionRes.json();

    const result = await assignRoutineToMember(
      session.id,
      Number(memberId),
      Number(routineId)
    );

    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage("Rutina asignada correctamente");
      setMemberId("");
      setRoutineId("");
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Asignar Rutina a Alumno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="">Seleccionar alumno</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </option>
          ))}
        </select>

        <select
          value={routineId}
          onChange={(e) => setRoutineId(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="">Seleccionar rutina</option>
          {routines.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}

        <Button
          onClick={handleAssign}
          disabled={!memberId || !routineId}
        >
          Asignar Rutina
        </Button>
      </CardContent>
    </Card>
  );
}
