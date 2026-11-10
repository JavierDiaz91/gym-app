"use client";
import { useState } from "react";
import Link from "next/link";
import { requestResetAction } from "./actions";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return <main className="min-h-screen bg-[#071320] text-white flex items-center justify-center p-5">
    <form className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#0b2030] p-8" onSubmit={async e => {
      e.preventDefault(); if (loading) return; setLoading(true); setError("");
      try { const result = await requestResetAction(email); setError(result.error || ""); setMessage(result.message || ""); }
      catch { setError("No se pudo procesar la solicitud."); } finally { setLoading(false); }
    }}>
      <h1 className="text-3xl font-semibold">Recuperá tu contraseña</h1>
      <p className="text-zinc-400 text-sm">Ingresá el correo asociado a tu cuenta Kivra. Te enviaremos un enlace para crear una contraseña nueva.</p>
      <label className="block text-sm" htmlFor="email">Correo electrónico</label>
      <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-white/20 bg-white/5 p-3" placeholder="nombre@correo.com" />
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      {message && <p role="status" className="text-teal-300">{message}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-[#00d5d0] p-3 font-semibold text-[#071320] disabled:opacity-60">{loading ? "Enviando..." : "Enviar enlace de recuperación"}</button>
      <Link className="block text-center text-sm text-[#67e8e3]" href="/login">Volver al inicio de sesión</Link>
    </form>
  </main>;
}
