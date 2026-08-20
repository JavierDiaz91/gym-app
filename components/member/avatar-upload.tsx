"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { updateAvatar } from "@/app/actions";

interface AvatarUploadProps {
  initialImage?: string;
  initials: string;
}

export function AvatarUpload({ initialImage, initials }: AvatarUploadProps) {
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      // Convertir a Base64 para vista rápida / guardado directo
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setImage(base64String);

        // Guardar en Base de Datos vía Server Action
        await updateAvatar(base64String);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error al procesar la imagen:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Input de archivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Circulo con foto o iniciales */}
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xl overflow-hidden border border-emerald-500/20 relative">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        ) : image ? (
          <img
            src={image}
            alt="Foto de perfil"
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Botón activador */}
      <button
        type="button"
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        className="text-sm border px-3 py-1.5 rounded-md hover:bg-muted font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        <Camera className="w-4 h-4" />
        {loading ? "Cargando..." : "Cambiar Foto"}
      </button>
    </div>
  );
}