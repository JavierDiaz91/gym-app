import { getSession, updateProfile } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { User, Lock, Save } from "lucide-react";
import { AvatarUpload } from "@/components/member/avatar-upload";
import { ChangePasswordForm } from "@/components/member/change-password-form";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.user?.id || session.id || session.userId;

  // Traer los datos reales del alumno
  let member: any = null;
  try {
    const result = await sql`
      SELECT 
        m.first_name, 
        m.last_name, 
        m.phone, 
        m.emergency_contact,
        m.avatar_url,
        u.email
      FROM members m
      JOIN users u ON u.id = m.user_id
      WHERE m.user_id = ${userId} OR m.id = ${userId}
      LIMIT 1
    `;
    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    member = rows[0] || {};
  } catch (error) {
    console.error("Error al obtener datos del perfil:", error);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Sección Información Personal */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Información Personal
          </h2>
          <p className="text-sm text-muted-foreground">
            Actualizá tus datos de contacto
          </p>
        </div>

        {/* Carga e interacción del Avatar */}
        <AvatarUpload
          initialImage={member.avatar_url}
          initials={member.first_name?.[0]?.toUpperCase() || "A"}
        />

        <form
          action={async (formData: FormData) => {
            "use server";
            await updateProfile(formData);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nombre</label>
              <input
                name="firstName"
                defaultValue={member.first_name || ""}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Apellido</label>
              <input
                name="lastName"
                defaultValue={member.last_name || ""}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input
              value={member.email || session.email || ""}
              disabled
              className="w-full border rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Teléfono</label>
            <input
              name="phone"
              defaultValue={member.phone || ""}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              Contacto de Emergencia
            </label>
            <input
              name="emergencyContact"
              defaultValue={member.emergency_contact || ""}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" /> Guardar Cambios
          </button>
        </form>
      </div>

      {/* Sección Cambiar Contraseña */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Cambiar Contraseña
          </h2>
          <p className="text-sm text-muted-foreground">
            Actualizá tu contraseña de acceso
          </p>
        </div>

        {/* Componente Client Form con estados y feedback de error/éxito */}
        <ChangePasswordForm />
      </div>
    </div>
  );
}