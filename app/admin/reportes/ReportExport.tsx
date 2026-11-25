"use client";
export function ReportExport({from,to,rows}:{from:string;to:string;rows:(string|number)[][]}){
 function download(){
  const csv=rows.map(row=>row.map(v=>{let s=typeof v==="number"?String(v).replace(".",","):String(v);if(typeof v==="string"&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="Kivra-reportes-"+from+"-"+to+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function printReport(){
  const w=window.open("","_blank","width=1000,height=800");if(!w){window.alert("Permití las ventanas emergentes para imprimir el reporte.");return;}
  const esc=(v:string|number)=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const body=rows.slice(1).map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("");
  w.document.open();w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte Kivra</title><style>@page{size:A4;margin:16mm}body{font:14px Arial,sans-serif;color:#102333;background:white;margin:24px}h1{color:#087f83;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:9px;border-bottom:1px solid #dce5e8}tr:nth-child(even){background:#f4f8f9}tr{break-inside:avoid}@media print{body{margin:0}}</style></head><body><h1>KIVRA | Reporte de gestión</h1><p>Período: ${esc(from)} al ${esc(to)}</p><table>${body}</table></body></html>`);w.document.close();w.focus();w.setTimeout(()=>w.print(),350);
 }
 return <div className="flex flex-wrap gap-2 print:hidden"><button onClick={download} className="rounded-lg border px-4 py-2 text-sm">Exportar CSV (Excel)</button><button onClick={printReport} className="rounded-lg border px-4 py-2 text-sm">Imprimir / Guardar PDF</button></div>;
}
