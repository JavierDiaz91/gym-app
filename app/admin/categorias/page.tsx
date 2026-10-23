import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { listGymCategories } from "./actions";
import CategoriesClient from "./CategoriesClient";
export const dynamic="force-dynamic";
export default async function CategoriesPage(){
 const session=await getSession();
 if(!session || session.role!=="admin" || session.gymId==null) redirect("/login");
 let categories:Awaited<ReturnType<typeof listGymCategories>>=[];
 let error="";
 try { categories=await listGymCategories(); }catch { error="Falta aplicar la migración 009 de preferencias. La 008 es opcional."; }
 return <CategoriesClient initial={categories} setupError={error}/>;
}
