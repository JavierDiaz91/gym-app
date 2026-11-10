"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "./actions";
function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return <main className="min-h-screen bg-[#071320] text-white flex items-center justify-center p-5">
    <form className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#0b2030] p-8" onSubmit={async e => {
      e.preventDefault(); if (loading) return;
      if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
      setLoading(true); setError("");
      try { const result = await resetPasswordAction(token, password); setError(result.error || ""); if (result.success) setMessage("Contraseña actualizada. Ya podés iniciar sesión."); }
      catch { setError("No se pudo cambiar la contraseña."); } finally { setLoading(false); }
    }}>
      <h1 className="text-3xl font-semibold">Nueva contraseña</h1>
      {!token && <p className="text-rose-300">Enlace inválido. Solicitá uno nuevo.</p>}
      {token && !message && <>
        <label className="block text-sm" htmlFor="password">Contraseña nueva</label>
        <input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-white/20 bg-white/5 p-3" />
        <label className="block text-sm" htmlFor="confirm">Repetir contraseña</label>
        <input id="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-xl border border-white/20 bg-white/5 p-3" />
        {error && <p role="alert" className="text-rose-300">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-[#00d5d0] p-3 font-semibold text-[#071320] disabled:opacity-60">{loading ? "Guardando..." : "Cambiar contraseña"}</button>
      </>}
      {message && <p role="status" className="text-teal-300">{message}</p>}
      <Link href="/login" className="block text-center text-sm text-[#67e8e3]">Volver al login</Link>
    </form>
  </main>;
}
export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#071320]" />}><ResetForm /></Suspense>;
}
