"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Laptop, Palette } from "lucide-react";

export default function ThemeToggleBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Menú desplegable flotante */}
      {isOpen && (
        <div className="bg-[#1a1e26] border border-gray-800 p-1.5 rounded-2xl shadow-2xl flex flex-col gap-1 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              theme === "dark"
                ? "bg-[#00aeef] text-black shadow-md"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Oscuro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              theme === "light"
                ? "bg-[#00aeef] text-black shadow-md"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Claro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("system");
              setIsOpen(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              theme === "system"
                ? "bg-[#00aeef] text-black shadow-md"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Sistema</span>
          </button>
        </div>
      )}

      {/* Botón Principal (Gatillo) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-[#1a1e26] hover:bg-[#222834] text-[#00aeef] border border-gray-800 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        title="Cambiar tema de color"
      >
        {theme === "light" ? (
          <Sun className="w-5 h-5" />
        ) : theme === "dark" ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Palette className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}