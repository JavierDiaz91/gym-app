"use client";
export function ReportExport({from,to,rows}:{from:string;to:string;rows:(string|number)[][]}){
 function download(){
  const csv=rows.map(row=>row.map(v=>{let s=typeof v==="number"?String(v).replace(".",","):String(v);if(typeof v==="string"&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="Kivra-reportes-"+from+"-"+to+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <div className="flex flex-wrap gap-2 print:hidden"><button onClick={download} className="rounded-lg border px-4 py-2 text-sm">Exportar CSV (Excel)</button><button onClick={()=>window.print()} className="rounded-lg border px-4 py-2 text-sm">Imprimir / Guardar PDF</button></div>;
}
