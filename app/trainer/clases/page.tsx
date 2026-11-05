import ClassesManager from "@/components/classes/ClassesManager";
import { listGymClasses } from "@/app/clases-actions";
export default async function TrainerClassesPage() {
 const data=await listGymClasses();
 if(data.role!=="trainer") return <p>Sin permisos</p>;
 return <ClassesManager initial={data as any} role="trainer"/>;
}
