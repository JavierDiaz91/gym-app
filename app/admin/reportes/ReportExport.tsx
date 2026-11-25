"use client";
export function ReportExport({from,to,rows}:{from:string;to:string;rows:(string|number)[][]}){
 function download(){
  const csv=rows.map(row=>row.map(v=>{let s=typeof v==="number"?String(v).replace(".",","):String(v);if(typeof v==="string"&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="Kivra-reportes-"+from+"-"+to+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function printReport(){
  const w=window.open("","_blank","width=1000,height=800");if(!w){window.alert("Permití las ventanas emergentes para imprimir el reporte.");return;}
  const esc=(v:string|number)=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const money=(v:string|number)=>Number(v).toLocaleString("es-AR",{style:"currency",currency:"ARS"});
  const date=(v:string)=>v.split("-").reverse().join("/");
  const sections=rows.slice(5); const a=sections.findIndex(r=>r[0]==="Fecha"), b=sections.findIndex(r=>r[0]==="Plan");
  const methods=sections.slice(1,a), daily=sections.slice(a+1,b), plans=sections.slice(b+1);
  const total=Number(rows[1][1]);
  const bars=(items:(string|number)[][],index:number,format:(v:string|number)=>string)=>{const max=Math.max(1,...items.map(r=>Number(r[index])));return items.map(r=>`<div class="barrow"><span>${esc(r[0])}</span><strong>${esc(format(r[index]))}</strong><div class="track"><div style="width:${Math.max(0,Number(r[index])/max*100)}%"></div></div></div>`).join("");};
  const table=(headers:string[],data:(string|number)[][])=>`<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${data.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const body=`<div class="kpis">${rows.slice(1,5).map((r,i)=>`<div><small>${esc(r[0])}</small><h2>${esc(i===0?money(r[1]):r[1])}</h2></div>`).join("")}</div><section><h2>Ingresos por método de pago</h2>${bars(methods,1,money)}<p><strong>Total: ${money(total)}</strong></p></section><section><h2>Distribución de membresías</h2>${bars(plans,1,String)}</section><section><h2>Evolución del período</h2>${table(["Fecha","Asistencias","Ingresos"],daily.map(r=>[date(String(r[0])),r[1],money(r[2])]))}</section><footer>Kivra · Sistema de gestión deportiva</footer>`;
  w.document.open();w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte Kivra</title><style>@page{size:A4;margin:16mm}body{font:14px Arial,sans-serif;color:#102333;background:white;margin:24px}h1{color:#087f83;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:9px;border-bottom:1px solid #dce5e8}tr:nth-child(even){background:#f4f8f9}tr{break-inside:avoid}th{text-align:left;background:#e8f4f4;padding:9px}thead{display:table-header-group}.kpis{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}.kpis>div{border:1px solid #dce5e8;border-radius:8px;padding:12px}.kpis h2{margin:8px 0 0;color:#087f83}section{margin-top:22px}section h2{font-size:17px;color:#087f83}.barrow{display:grid;grid-template-columns:1fr auto;gap:5px;margin:10px 0;break-inside:avoid}.track{grid-column:1/-1;background:#e8f4f4;height:8px}.track div{height:8px;background:#087f83}footer{margin-top:24px;border-top:1px solid #dce5e8;padding-top:10px;color:#64748b}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}@media print{body{margin:0}}</style></head><body><h1>KIVRA | Reporte de gestión</h1><p>Período: ${esc(date(from))} al ${esc(date(to))}</p>${body}</body></html>`);w.document.close();w.focus();w.setTimeout(()=>w.print(),350);
 }
 return <div className="flex flex-wrap gap-2 print:hidden"><button onClick={download} className="rounded-lg border px-4 py-2 text-sm">Exportar CSV (Excel)</button><button onClick={printReport} className="rounded-lg border px-4 py-2 text-sm">Imprimir / Guardar PDF</button></div>;
}
