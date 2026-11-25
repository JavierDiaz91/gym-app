"use client";
import {usePathname} from "next/navigation";
import {Building2} from "lucide-react";
import {NotificationCenter} from "@/components/admin/notification-center";
export function AdminHeader({gymName}:{gymName:string}){
 const dashboard=usePathname()==="/admin";
 return <header className="flex min-w-0 items-center justify-between gap-3 border-b border-border pb-3 sm:pb-4">
 <div className="min-w-0">
 <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Building2 className="size-4 shrink-0 text-primary"/><span className="truncate">{gymName}</span></div>
 {dashboard&&<><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Panel general</h1><p className="mt-1 text-sm text-muted-foreground">Resumen de actividad y rendimiento</p></>}
 </div><NotificationCenter/>
 </header>;
}
