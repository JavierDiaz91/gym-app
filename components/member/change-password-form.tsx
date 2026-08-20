"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions";
import { Lock, Loader2 } from "lucide-react";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-sm">
          {state.success}
        </div>
      )}

      <div>
        <label className="text-sm font-medium block mb-1">
          Contraseña Actual
        </label>
        <input
          type="password"
          name="currentPassword"
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          Nueva Contraseña
        </label>
        <input
          type="password"
          name="newPassword"
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          Confirmar Nueva Contraseña
        </label>
        <input
          type="password"
          name="confirmPassword"
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 py-2 rounded-lg text-sm transition-colors border flex items-center gap-2 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Actualizando...
          </>
        ) : (
          "Cambiar Contraseña"
        )}
      </button>
    </form>
  );
}