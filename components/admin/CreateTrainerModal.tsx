"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { createTrainer } from "@/app/actions";

interface CreateTrainerModalProps {
  buttonText?: string;
  variant?: "default" | "outline";
}

export function CreateTrainerModal({ buttonText = "Nuevo Entrenador", variant = "default" }: CreateTrainerModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createTrainer(formData);

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Entrenador</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">Nombre</Label>
              <Input id="first_name" name="first_name" required placeholder="Lucas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Apellido</Label>
              <Input id="last_name" name="last_name" required placeholder="Gómez" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" required placeholder="lucas@fitzone.com" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña inicial</Label>
            <Input id="password" name="password" type="password" required defaultValue="123456" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specialization">Especialización</Label>
            <Input id="specialization" name="specialization" placeholder="Musculación / Hipertrofia" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Biografía / Notas</Label>
            <Textarea id="bio" name="bio" rows={2} placeholder="Experiencia..." className="resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}