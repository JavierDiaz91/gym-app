"use server";
import { sql } from "@/lib/db";
import { getSession } from "@/app/actions";
import { revalidatePath } from "next/cache";

const dimensions = ["discipline","objective","level","audience"] as const;
async function gym() {
 const s = await getSession();
 if (!s || s.role !== "admin" || !Number.isSafeInteger(Number(s.gymId)) || Number(s.gymId) <= 0) throw new Error("No autorizado");
 return Number(s.gymId);
}
export async function listGymCategories() {
 const id=await gym();
 const rows=await sql`
 SELECT c.id,c.dimension,c.slug,c.label,c.gym_id,c.is_active,
 CASE WHEN c.gym_id IS NULL THEN COALESCE(p.is_enabled,FALSE) ELSE c.is_active END AS enabled
 FROM training_categories c
 LEFT JOIN training_category_preferences p ON p.category_id=c.id AND p.gym_id=${id}
 WHERE c.gym_id IS NULL OR c.gym_id=${id}
 ORDER BY c.dimension,c.gym_id NULLS FIRST,c.label
 `;
 return rows.map(r=>({id:Number(r.id),dimension:String(r.dimension),slug:String(r.slug),label:String(r.label),global:r.gym_id==null,enabled:r.enabled===true}));
}
export async function createGymCategory(dimension:string,label:string) {
 try {
 const id=await gym();
 if (!dimensions.includes(dimension as typeof dimensions[number])) return {error:"Dimensión inválida"};
 const clean=label.trim();
 if(clean.length<2 || clean.length>80) return {error:"El nombre debe tener entre 2 y 80 caracteres"};
 const slug=clean.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 if(!slug) return {error:"Nombre inválido"};
 await sql`INSERT INTO training_categories(gym_id,dimension,slug,label) VALUES(${id},${dimension},${slug},${clean}) ON CONFLICT (gym_id,dimension,slug) WHERE gym_id IS NOT NULL DO UPDATE SET label=EXCLUDED.label,is_active=TRUE`;
 revalidatePath("/admin/categorias"); return {success:true};
 } catch {return {error:"No se pudo crear la categoría"}}
}
export async function updateGymCategory(categoryId:number,enabled:boolean,label?:string) {
 try {
 const id=await gym();
 if(!Number.isSafeInteger(categoryId)||categoryId<=0) return {error:"Categoría inválida"};
 const [c]=await sql`SELECT gym_id FROM training_categories WHERE id=${categoryId} AND (gym_id IS NULL OR gym_id=${id})`;
 if(!c) return {error:"Categoría no disponible"};
 if(c.gym_id==null) {
 await sql`INSERT INTO training_category_preferences(gym_id,category_id,is_enabled) VALUES(${id},${categoryId},${enabled}) ON CONFLICT(gym_id,category_id) DO UPDATE SET is_enabled=EXCLUDED.is_enabled`;
 } else {
 const name=label?.trim();
 if(name!==undefined && (name.length<2 || name.length>80)) return {error:"Nombre inválido"};
 await sql`UPDATE training_categories SET is_active=${enabled},label=COALESCE(${name??null},label) WHERE id=${categoryId} AND gym_id=${id}`;
 }
 revalidatePath("/admin/categorias"); return {success:true};
 }catch{return {error:"No se pudo actualizar la categoría"}}
}
