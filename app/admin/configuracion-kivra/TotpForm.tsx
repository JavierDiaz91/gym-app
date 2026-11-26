"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { startTotp, enableTotp, disableTotp } from "./totp-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TotpForm({enabled}:{enabled:boolean}){
 const [expanded,setExpanded]=useState(false);
 const [password,setPassword]=useState("");
 const [code,setCode]=useState("");
 const [email,setEmail]=useState("");
 const [secret,setSecret]=useState("");
 const [codes,setCodes]=useState<string[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
 e.preventDefault();if(busy)return;setBusy(true);setError("");
 try{
 if(enabled){
 if(!window.confirm("¿Desactivar la autenticación en dos pasos?"))return;
 const r=await disableTotp(password,code);
 if(r.error)setError(r.error);else window.location.replace("/login");
 }else if(!secret){
 const r=await startTotp(password);
 if(r.error)setError(r.error);else if(r.secret){setSecret(r.secret);setEmail(r.email??"Superadmin");}
 }else{
 const r=await enableTotp(password,code);
 if(r.error)setError(r.error);else if(r.codes){setCodes(r.codes);setSecret("");setPassword("");setCode("");}
 }
 }catch{setError("No se pudo completar la operación.");}finally{setBusy(false);}
 }
 if(codes.length)return <section className="space-y-4 rounded-xl border p-4"><h3 className="font-semibold">2FA activado</h3><p className="text-sm">Guardá estos códigos en un lugar seguro. Se muestran una sola vez y cada uno permite un único acceso.</p><div className="grid gap-2 sm:grid-cols-2">{codes.map(c=><code key={c} className="break-all rounded bg-muted p-2 text-xs">{c}</code>)}</div><Button variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob(["Kivra - códigos de recuperación\n"+codes.join("\n")],{type:"text/plain"}));const a=document.createElement("a");a.href=url;a.download="kivra-recuperacion.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Descargar códigos</Button><Button onClick={()=>window.location.replace("/login")}>Ya guardé los códigos. Iniciar sesión</Button></section>;
 return <section className="space-y-4 rounded-xl border p-4">
 <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Autenticación en dos pasos (2FA)</h3><span className={"rounded-full border px-3 py-1 text-xs "+(enabled?"border-emerald-500/30 bg-emerald-500/10 text-emerald-500":"text-muted-foreground")}>{enabled?"Activada":"Desactivada"}</span></div>
 <p className="text-sm text-muted-foreground">Protegé el acceso del superadmin con Google Authenticator o una aplicación compatible.</p>
 {!expanded?<Button variant={enabled?"outline":"default"} onClick={()=>setExpanded(true)}>{enabled?"Administrar 2FA":"Configurar 2FA"}</Button>:<form onSubmit={submit} className="space-y-3">
 <label className="block text-sm">Contraseña actual<Input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256}/></label>
 {secret&&<div className="space-y-2 rounded-lg bg-muted p-3 text-sm"><p className="font-medium">Escaneá el QR con Google Authenticator.</p><div className="flex justify-center"><div className="rounded-lg bg-white p-3"><QRCodeSVG value={"otpauth://totp/"+encodeURIComponent("Kivra:"+email)+"?secret="+secret+"&issuer=Kivra&algorithm=SHA1&digits=6&period=30"} size={192} level="M" marginSize={4}/></div></div><p>Si no podés escanearlo, ingresá la siguiente clave manualmente. Elegí el tipo basado en tiempo.</p><code className="block break-all font-mono">{secret}</code><Button type="button" variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(secret);}catch{setError("No se pudo copiar. Seleccioná la clave manualmente.");}}}>Copiar clave</Button></div>}
 {(enabled||secret)&&<label className="block text-sm">{enabled?"Código TOTP o de recuperación":"Código de seis dígitos"}<Input value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code" required maxLength={enabled?32:6} inputMode={enabled?"text":"numeric"}/></label>}
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy} variant={enabled?"destructive":"default"}>{busy?"Procesando...":enabled?"Desactivar 2FA":secret?"Confirmar activación":"Configurar 2FA"}</Button>{<Button type="button" variant="outline" disabled={busy} onClick={()=>{setExpanded(false);setSecret("");setCode("");setPassword("");setError("");}}>Cancelar</Button>}</div>
 </form>}</section>;
}
