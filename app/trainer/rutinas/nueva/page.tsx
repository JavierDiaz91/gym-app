"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoutine } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function NuevaRutinaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await createRoutine(
      Number(formData.get("trainerUserId")),
      formData.get("name") as string,
      formData.get("description") as string
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/trainer/rutinas");
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Nueva Rutina</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="name"
            placeholder="Nombre de la rutina"
            required
          />

          <Textarea
            name="description"
            placeholder="Descripción (opcional)"
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button disabled={loading} type="submit">
            Crear Rutina
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
