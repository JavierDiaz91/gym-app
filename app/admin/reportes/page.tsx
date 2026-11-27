import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { ReportExport } from "./ReportExport";
import { ReportesCharts } from "./ReportesCharts";

const money = (n: number) => n.toLocaleString("es-AR", {style:"currency",currency:"ARS",maximumFractionDigits:2});
const day = (d: Date) => d.toISOString().slice(0,10);
const valid = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && day(new Date(s)) === s;
export default async function ReportesPage({searchParams}: {searchParams: Promise<{period?:string;from?:string;to?:string}>}) {
  const session = await getSession();
  if (!session || session.role !== "admin" || !session.gymId) return <p>No autorizado.</p>;
  const [access] = await sql`SELECT public.kivra_gym_module_enabled(${session.gymId}::integer, 'reports', 'admin') AS enabled`;
  if (access?.enabled !== true) return <p>Módulo deshabilitado.</p>;
  const gym = session.gymId;
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const now = new Date(today+"T00:00:00Z");
  const offset = (n:number) => day(new Date(now.getTime()+n*86400000));
  const presets: Record<string,string> = {today, yesterday:offset(-1),week:offset(-((now.getUTCDay()+6)%7)),month:today.slice(0,7)+"-01",year:today.slice(0,4)+"-01-01"};
  const period = params.period === "custom" ? "custom" : Object.keys(presets).includes(params.period || "") ? params.period! : "month";
  const from = period === "custom" && valid(params.from) ? params.from : presets[period] || presets.month;
  const to = period === "custom" && valid(params.to) ? params.to : period === "yesterday" ? offset(-1) : today;
  const invalid = from > to || to > today || (Date.parse(to)-Date.parse(from))/86400000 > 366;
  const monthly = (Date.parse(to)-Date.parse(from))/86400000 > 62;
  const unit = monthly ? "month" : "day";
  const filter = <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
    <div className="flex flex-wrap gap-2 w-full">{Object.entries({today:"Hoy",yesterday:"Ayer",week:"Esta semana",month:"Este mes",year:"Este año"}).map(([key,label])=><a key={key} href={"?period="+key} className={"rounded-lg border px-3 py-2 text-sm "+(period===key?"bg-primary text-primary-foreground":"hover:bg-muted")}>{label}</a>)}</div>
    <input type="hidden" name="period" value="custom"/>
    <label className="text-sm flex flex-col gap-1">Desde<input required type="date" name="from" defaultValue={from} max={today} className="rounded-lg border bg-background p-2"/></label>
    <label className="text-sm flex flex-col gap-1">Hasta<input required type="date" name="to" defaultValue={to} max={today} className="rounded-lg border bg-background p-2"/></label>
    <button className="rounded-lg bg-primary text-primary-foreground px-4 py-2">Aplicar filtro</button>
  </form>;
  if(invalid) return <div className="space-y-4">{filter}<p className="text-destructive">Seleccioná un período válido de hasta 367 días, sin fechas futuras.</p></div>;
  const [rows,visits,revenue,plans,methods,peak] = await Promise.all([
    sql`SELECT (SELECT COUNT(*) FROM members WHERE gym_id=${gym} AND (created_at - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date) AS new_members,
      (SELECT COUNT(*) FROM attendance a JOIN members m ON m.id=a.member_id WHERE m.gym_id=${gym} AND (a.check_in - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date) AS visits,
      (SELECT COUNT(DISTINCT a.member_id) FROM attendance a JOIN members m ON m.id=a.member_id WHERE m.gym_id=${gym} AND (a.check_in - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date) AS visitors,
      (SELECT COUNT(DISTINCT p.subscription_id) FROM payments p JOIN members m ON m.id=p.member_id WHERE m.gym_id=${gym} AND p.status='completed' AND (p.payment_date - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date) AS sales,
      (SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN members m ON m.id=p.member_id WHERE m.gym_id=${gym} AND p.status='completed' AND (p.payment_date - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date) AS revenue`,
    sql`SELECT to_char(date_trunc(${unit},a.check_in - interval '3 hours'),'YYYY-MM-DD') AS bucket, COUNT(*) AS total FROM attendance a JOIN members m ON m.id=a.member_id WHERE m.gym_id=${gym} AND (a.check_in - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date GROUP BY 1 ORDER BY 1`,
    sql`SELECT to_char(date_trunc(${unit},p.payment_date - interval '3 hours'),'YYYY-MM-DD') AS bucket, SUM(p.amount) AS total FROM payments p JOIN members m ON m.id=p.member_id WHERE m.gym_id=${gym} AND p.status='completed' AND (p.payment_date - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date GROUP BY 1 ORDER BY 1`,
    sql`SELECT mp.name, COUNT(DISTINCT s.id) AS count FROM payments p JOIN members m ON m.id=p.member_id JOIN subscriptions s ON s.id=p.subscription_id AND s.member_id=m.id JOIN membership_plans mp ON mp.id=s.plan_id AND mp.gym_id=m.gym_id WHERE m.gym_id=${gym} AND p.status='completed' AND (p.payment_date - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date GROUP BY mp.name ORDER BY count DESC`,
    sql`SELECT lower(p.payment_method) AS method,SUM(p.amount) AS total FROM payments p JOIN members m ON m.id=p.member_id WHERE m.gym_id=${gym} AND p.status='completed' AND (p.payment_date - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date GROUP BY 1`,
    sql`SELECT EXTRACT(HOUR FROM a.check_in - interval '3 hours') AS hour,COUNT(*) AS total FROM attendance a JOIN members m ON m.id=a.member_id WHERE m.gym_id=${gym} AND (a.check_in - interval '3 hours')::date BETWEEN ${from}::date AND ${to}::date GROUP BY 1 ORDER BY total DESC,hour LIMIT 1`
  ]);
  const stats=rows[0];
  const buckets:string[]=[];
  for(let d=new Date((monthly?from.slice(0,7)+"-01":from)+"T00:00:00Z");day(d)<=to;monthly?d.setUTCMonth(d.getUTCMonth()+1):d.setUTCDate(d.getUTCDate()+1)) buckets.push(day(d));
  const label=(v:string)=>new Date(v+"T00:00:00Z").toLocaleDateString("es-AR",{timeZone:"UTC",month:"short",...(monthly?{year:"2-digit"}:{day:"numeric"})});
  const methodNames:Record<string,string>={cash:"Efectivo",efectivo:"Efectivo",transfer:"Transferencia",transferencia:"Transferencia",card:"Tarjeta presencial",tarjeta:"Tarjeta presencial",mercadopago:"Mercado Pago"};
  const totals:Record<string,number>={"Efectivo":0,"Transferencia":0,"Tarjeta presencial":0,"Mercado Pago":0};
  for(const m of methods){const key=methodNames[String(m.method)]||"Otros";totals[key]=(totals[key]||0)+Number(m.total);}
  return <div className="min-w-0 space-y-6">
    <div><h1 className="text-3xl font-bold">Reportes</h1><p className="text-muted-foreground">Análisis y estadísticas del gimnasio</p></div>
    {filter}
    <ReportExport from={from} to={to} rows={[["Reporte Kivra",from,to],["Ingresos cobrados",Number(stats.revenue)],["Asistencias",Number(stats.visits)],["Nuevos miembros",Number(stats.new_members)],["Membresías y pases vendidos",Number(stats.sales)],["Método","Importe ARS"],...Object.entries(totals),["Fecha","Asistencias","Ingresos ARS"],...buckets.map(b=>[b,Number(visits.find(v=>v.bucket===b)?.total||0),Number(revenue.find(v=>v.bucket===b)?.total||0)]),["Plan","Cantidad"],...plans.map(p=>[String(p.name),Number(p.count)])]}/>
    <p className="text-sm text-muted-foreground">Período: {from.split("-").reverse().join("/")} al {to.split("-").reverse().join("/")} · Hora argentina</p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Ingresos cobrados",money(Number(stats.revenue))],["Asistencias",stats.visits],["Nuevos miembros",stats.new_members],["Membresías y pases vendidos",stats.sales]].map(([name,value])=><Card key={String(name)} className="min-w-0"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{name}</p><p className="text-2xl font-bold break-words">{String(value)}</p></CardContent></Card>)}</div>
    <Card><CardContent className="p-5 space-y-3"><h2 className="font-semibold">Ingresos por método de pago</h2>{Object.entries(totals).map(([name,total])=><div key={name} className="flex justify-between gap-3 border-b pb-2 text-sm"><span>{name}</span><strong>{money(total)}</strong></div>)}</CardContent></Card>
    <ReportesCharts attendanceData={buckets.map(b=>({date:label(b),visitas:Number(visits.find(v=>v.bucket===b)?.total||0)}))} revenueData={buckets.map(b=>({month:label(b),ingresos:Number(revenue.find(v=>v.bucket===b)?.total||0)}))} membershipDist={plans.map(p=>({name:String(p.name),count:Number(p.count)}))} metrics={{avgVisitsPerMember:Number(stats.visitors)?(Number(stats.visits)/Number(stats.visitors)).toFixed(1)+" visitas":"0 visitas",peakHour:peak.length?String(peak[0].hour)+":00 hs":"Sin datos",avgRevenuePerMember:Number(stats.sales)?money(Number(stats.revenue)/Number(stats.sales)):"—"}}/>
  </div>;
}
