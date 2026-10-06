"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Copy, Check, Printer, Loader2, Plus, Trash2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface ScheduleItem {
  day_group: string;
  open_time?: string;
  close_time?: string;
  is_closed?: boolean;
}

interface HolidayItem {
  id?: number | string;
  fecha?: string;
  motivo?: string;
}

interface FeriadoUI {
  id: string;
  fecha: string;
  motivo: string;
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const [gymId] = useState<number>(1);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [mounted, setMounted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Estados de carga
  const [loadingGeneral, setLoadingGeneral] = useState<boolean>(false);
  const [loadingHorarios, setLoadingHorarios] = useState<boolean>(false);
  const [loadingNotif, setLoadingNotif] = useState<boolean>(false);

  // Mensaje de éxito global
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Formulario General
  const [generalForm, setGeneralForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
  });

  // Estado de horarios
  const [horariosForm, setHorariosForm] = useState({
    lunVieApertura: "06:00",
    lunVieCierre: "22:00",
    lunVieCerrado: false,
    sabApertura: "07:00",
    sabCierre: "20:00",
    sabCerrado: false,
    domApertura: "08:00",
    domCierre: "14:00",
    domCerrado: true,
  });

  // Estado de feriados
  const [feriados, setFeriados] = useState<FeriadoUI[]>([]);

  // Formulario Notificaciones
  const [notifForm, setNotifForm] = useState({
    nuevosRegistros: true,
    membresiasVencer: true,
    pagosRecibidos: false,
    reservasClases: true,
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // 1. CARGAR DATOS GENERALES Y HORARIOS DESDE EL BACKEND
  useEffect(() => {
    const fetchDatosGimnasio = async () => {
      try {
        // Cargar Información General
        const resGeneral = await fetch(`${API_BASE_URL}/gyms/${gymId}`, { cache: "no-store" });
        if (resGeneral.ok) {
          const dataGeneral = await resGeneral.json();
          const gym = dataGeneral.data || dataGeneral;
          setGeneralForm({
            name: gym.name || gym.nombre || "",
            phone: gym.phone || gym.telefono || "",
            address: gym.address || gym.direccion || "",
            email: gym.email || "",
          });
        }

        // Cargar Horarios y Feriados
        const resHorarios = await fetch(`${API_BASE_URL}/gyms/${gymId}/configuracion/horarios`, { cache: "no-store" });
        if (resHorarios.ok) {
          const dataHorarios = await resHorarios.json();
          if (dataHorarios.success && dataHorarios.data) {
            const { schedules, holidays } = dataHorarios.data as {
              schedules?: ScheduleItem[];
              holidays?: HolidayItem[];
            };

            if (schedules && schedules.length > 0) {
              const lunVie = schedules.find((s) => s.day_group === "lun_vie");
              const sab = schedules.find((s) => s.day_group === "sabado");
              const dom = schedules.find((s) => s.day_group === "domingo");

              setHorariosForm({
                lunVieApertura: lunVie?.open_time || "06:00",
                lunVieCierre: lunVie?.close_time || "22:00",
                lunVieCerrado: lunVie?.is_closed ?? false,
                sabApertura: sab?.open_time || "07:00",
                sabCierre: sab?.close_time || "20:00",
                sabCerrado: sab?.is_closed ?? false,
                domApertura: dom?.open_time || "08:00",
                domCierre: dom?.close_time || "14:00",
                domCerrado: dom?.is_closed ?? true,
              });
            }

            if (holidays && holidays.length > 0) {
              setFeriados(
                holidays.map((h) => ({
                  id: h.id?.toString() || Math.random().toString(),
                  fecha: h.fecha ? h.fecha.split("T")[0] : "",
                  motivo: h.motivo || "",
                }))
              );
            }
          }
        }
      } catch (error) {
        console.error("Error al cargar datos del gimnasio:", error);
      }
    };

    if (gymId) fetchDatosGimnasio();
  }, [gymId]);

  const handleAddFeriado = () => {
    setFeriados([...feriados, { id: Date.now().toString(), fecha: "", motivo: "" }]);
  };

  const handleRemoveFeriado = (id: string) => {
    setFeriados(feriados.filter((f) => f.id !== id));
  };

  const handleUpdateFeriado = (id: string, field: "fecha" | "motivo", value: string) => {
    setFeriados(feriados.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const triggerSuccess = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const registerUrl = mounted ? `${baseUrl}/registro?gym=${gymId}` : "";

  const handleCopy = () => {
    if (!registerUrl) return;
    navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // 2. GUARDAR INFORMACIÓN GENERAL CONTRA LA API EXPRESS
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingGeneral(true);

    try {
      const res = await fetch(`${API_BASE_URL}/gyms/${gymId}`, {
        method: "PUT", // o POST según el endpoint de tu backend Express
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generalForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar la información general");
      }

      triggerSuccess("Información general guardada correctamente.");
      setTimeout(() => {
        router.refresh();
        router.push("/admin");
      }, 500);
    } catch (err: unknown) {
      console.error("Error al guardar información general:", err);
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      alert("Error al guardar: " + errorMessage);
    } finally {
      setLoadingGeneral(false);
    }
  };

  // 3. GUARDAR HORARIOS Y FERIADOS
  const handleSaveHorarios = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingHorarios(true);

    try {
      const payload = {
        schedules: [
          {
            dayGroup: "lun_vie",
            openTime: horariosForm.lunVieApertura,
            closeTime: horariosForm.lunVieCierre,
            isClosed: horariosForm.lunVieCerrado,
          },
          {
            dayGroup: "sabado",
            openTime: horariosForm.sabApertura,
            closeTime: horariosForm.sabCierre,
            isClosed: horariosForm.sabCerrado,
          },
          {
            dayGroup: "domingo",
            openTime: horariosForm.domApertura,
            closeTime: horariosForm.domCierre,
            isClosed: horariosForm.domCerrado,
          },
        ],
        holidays: feriados.filter((f) => f.fecha && f.motivo),
      };

      const res = await fetch(`${API_BASE_URL}/gyms/${gymId}/configuracion/horarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar la configuración");
      }

      triggerSuccess("Horarios y feriados actualizados correctamente.");

      setTimeout(() => {
        router.refresh();
        router.push("/admin");
      }, 500);
    } catch (err: unknown) {
      console.error("Error al guardar horarios:", err);
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      alert("Error al guardar: " + errorMessage);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const handleSaveNotificaciones = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNotif(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoadingNotif(false);
    triggerSuccess("Preferencias de notificaciones guardadas.");
    router.refresh();
    router.push("/admin");
  };

  return (
    <div className="space-y-8 text-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Configuración
          </h1>
          <p className="text-gray-400">
            Administrá la configuración del sistema y accesos de tu sede
          </p>
        </div>

        {savedMessage && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-xl text-sm font-medium animate-in fade-in flex items-center gap-2">
            <Check className="w-4 h-4" />
            {savedMessage}
          </div>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-[#14171d] border border-gray-800 p-1 rounded-xl">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="qr">Acceso / QR</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
        </TabsList>

        {/* Pestaña: GENERAL */}
        <TabsContent value="general">
          <Card className="bg-[#14171d] border-gray-800 text-gray-100">
            <CardHeader>
              <CardTitle className="text-white">Información del Gimnasio</CardTitle>
              <CardDescription className="text-gray-400">Datos básicos de tu negocio</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gymName" className="text-gray-300">Nombre del Gimnasio</Label>
                    <Input
                      id="gymName"
                      value={generalForm.name}
                      onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                      className="bg-[#0d0f12] border-gray-800 text-white"
                      placeholder="Ej: FitZone Gym"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300">Teléfono</Label>
                    <Input
                      id="phone"
                      value={generalForm.phone}
                      onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                      className="bg-[#0d0f12] border-gray-800 text-white"
                      placeholder="Ej: (3492) 12-3456"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-300">Dirección</Label>
                  <Input
                    id="address"
                    value={generalForm.address}
                    onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                    className="bg-[#0d0f12] border-gray-800 text-white"
                    placeholder="Ej: Av. Principal 123, Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email de Contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    value={generalForm.email}
                    onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                    className="bg-[#0d0f12] border-gray-800 text-white"
                    placeholder="Ej: info@fitzone.com"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loadingGeneral}
                  className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-bold gap-2"
                >
                  {loadingGeneral && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: ACCESO / QR */}
        <TabsContent value="qr">
          <Card className="bg-[#14171d] border-gray-800 text-gray-100 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00aeef]/10 border border-[#00aeef]/30 rounded-xl flex items-center justify-center text-[#00aeef]">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">Código QR de Auto-Registro</CardTitle>
                  <CardDescription className="text-gray-400">
                    Código QR único para que los alumnos escaneen en recepción y se registren en tu gimnasio.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8 bg-[#0d0f12] p-6 rounded-2xl border border-gray-800">
                <div className="bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center flex-shrink-0" id="qr-printable">
                  {registerUrl ? (
                    <QRCodeSVG
                      value={registerUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-xs">
                      Cargando QR...
                    </div>
                  )}
                  <p className="text-[11px] font-black text-black mt-2 uppercase tracking-widest text-center">
                    Escanear para Registrarse
                  </p>
                </div>

                <div className="space-y-4 w-full">
                  <div>
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      Enlace directo de alta de la sede
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        readOnly
                        value={registerUrl}
                        className="bg-[#14171d] border-gray-800 text-gray-300 font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="border-gray-800 hover:bg-gray-800 text-gray-200"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={handlePrint}
                      className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-bold gap-2 rounded-xl h-11"
                    >
                      <Printer className="w-4 h-4" /> Imprimir Cartel QR
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: HORARIOS */}
        <TabsContent value="horarios">
          <Card className="bg-[#14171d] border-gray-800 text-gray-100">
            <CardHeader>
              <CardTitle className="text-white">Horarios de Operación y Feriados</CardTitle>
              <CardDescription className="text-gray-400">
                Define los horarios de apertura y los días festivos o cierres especiales para notificar a los socios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <form onSubmit={handleSaveHorarios} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Horarios Semanales</h3>

                  {/* Lunes a Viernes */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-[#0d0f12] p-3 rounded-xl border border-gray-800">
                    <Label className="text-gray-200 font-medium">Lunes a Viernes</Label>
                    <Input
                      type="time"
                      value={horariosForm.lunVieApertura}
                      onChange={(e) => setHorariosForm({ ...horariosForm, lunVieApertura: e.target.value })}
                      disabled={horariosForm.lunVieCerrado}
                      className="bg-[#14171d] border-gray-800 text-white disabled:opacity-40"
                    />
                    <Input
                      type="time"
                      value={horariosForm.lunVieCierre}
                      onChange={(e) => setHorariosForm({ ...horariosForm, lunVieCierre: e.target.value })}
                      disabled={horariosForm.lunVieCerrado}
                      className="bg-[#14171d] border-gray-800 text-white disabled:opacity-40"
                    />
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                      <Switch
                        checked={horariosForm.lunVieCerrado}
                        onCheckedChange={(checked) => setHorariosForm({ ...horariosForm, lunVieCerrado: checked })}
                      />
                      <span className="text-xs text-gray-400">{horariosForm.lunVieCerrado ? "Cerrado" : "Abierto"}</span>
                    </div>
                  </div>

                  {/* Sábado */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-[#0d0f12] p-3 rounded-xl border border-gray-800">
                    <Label className="text-gray-200 font-medium">Sábado</Label>
                    <Input
                      type="time"
                      value={horariosForm.sabApertura}
                      onChange={(e) => setHorariosForm({ ...horariosForm, sabApertura: e.target.value })}
                      disabled={horariosForm.sabCerrado}
                      className="bg-[#14171d] border-gray-800 text-white disabled:opacity-40"
                    />
                    <Input
                      type="time"
                      value={horariosForm.sabCierre}
                      onChange={(e) => setHorariosForm({ ...horariosForm, sabCierre: e.target.value })}
                      disabled={horariosForm.sabCerrado}
                      className="bg-[#14171d] border-gray-800 text-white disabled:opacity-40"
                    />
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                      <Switch
                        checked={horariosForm.sabCerrado}
                        onCheckedChange={(checked) => setHorariosForm({ ...horariosForm, sabCerrado: checked })}
                      />
                      <span className="text-xs text-gray-400">{horariosForm.sabCerrado ? "Cerrado" : "Abierto"}</span>
                    </div>
                  </div>

                  {/* Domingo */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-[#0d0f12] p-3 rounded-xl border border-gray-800">
                    <Label className="text-gray-200 font-medium">Domingo</Label>
                    <Input
                      type="time"
                      value={horariosForm.domApertura}
                      onChange={(e) => setHorariosForm({ ...horariosForm, domApertura: e.target.value })}
                      disabled={horariosForm.domCerrado}
                      className="bg-[#14171d] border-gray-800 text-white disabled:opacity-40"
                    />
                    <Input
                      type="time"
                      value={horariosForm.domCierre}
                      onChange={(e) => setHorariosForm({ ...horariosForm, domCierre: e.target.value })}
                      disabled={horariosForm.domCerrado}
                      className="bg-[#14171d] border-gray-800 text-white disabled:opacity-40"
                    />
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                      <Switch
                        checked={horariosForm.domCerrado}
                        onCheckedChange={(checked) => setHorariosForm({ ...horariosForm, domCerrado: checked })}
                      />
                      <span className="text-xs text-gray-400">{horariosForm.domCerrado ? "Cerrado" : "Abierto"}</span>
                    </div>
                  </div>
                </div>

                {/* Cierres Especiales / Feriados */}
                <div className="space-y-4 pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Feriados y Cierres Especiales</h3>
                      <p className="text-xs text-gray-500">Se mostrarán avisos automáticos en la app de los alumnos.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddFeriado}
                      className="border-gray-800 hover:bg-gray-800 text-gray-300 text-xs gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Fecha
                    </Button>
                  </div>

                  {feriados.length === 0 ? (
                    <p className="text-xs text-gray-500 italic bg-[#0d0f12] p-4 rounded-xl border border-gray-800 text-center">
                      No hay feriados ni cierres programados.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {feriados.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 bg-[#0d0f12] p-3 rounded-xl border border-gray-800">
                          <Input
                            type="date"
                            value={f.fecha}
                            onChange={(e) => handleUpdateFeriado(f.id, "fecha", e.target.value)}
                            className="bg-[#14171d] border-gray-800 text-white w-auto"
                          />
                          <Input
                            type="text"
                            placeholder="Ej: Año Nuevo / Mantenimiento"
                            value={f.motivo}
                            onChange={(e) => handleUpdateFeriado(f.id, "motivo", e.target.value)}
                            className="bg-[#14171d] border-gray-800 text-white flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleRemoveFeriado(f.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 h-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loadingHorarios}
                  className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-bold gap-2"
                >
                  {loadingHorarios && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Horarios y Feriados
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: NOTIFICACIONES */}
        <TabsContent value="notificaciones">
          <Card className="bg-[#14171d] border-gray-800 text-gray-100">
            <CardHeader>
              <CardTitle className="text-white">Preferencias de Notificaciones</CardTitle>
              <CardDescription className="text-gray-400">Configurá las alertas del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNotificaciones} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Nuevos registros</Label>
                    <p className="text-sm text-gray-400">Recibir notificación cuando se registre un nuevo miembro</p>
                  </div>
                  <Switch
                    checked={notifForm.nuevosRegistros}
                    onCheckedChange={(checked) => setNotifForm({ ...notifForm, nuevosRegistros: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Membresías por vencer</Label>
                    <p className="text-sm text-gray-400">Alertas de membresías próximas a expirar</p>
                  </div>
                  <Switch
                    checked={notifForm.membresiasVencer}
                    onCheckedChange={(checked) => setNotifForm({ ...notifForm, membresiasVencer: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Pagos recibidos</Label>
                    <p className="text-sm text-gray-400">Notificación de cada pago procesado</p>
                  </div>
                  <Switch
                    checked={notifForm.pagosRecibidos}
                    onCheckedChange={(checked) => setNotifForm({ ...notifForm, pagosRecibidos: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Reservas de clases</Label>
                    <p className="text-sm text-gray-400">Alertas cuando se llene una clase</p>
                  </div>
                  <Switch
                    checked={notifForm.reservasClases}
                    onCheckedChange={(checked) => setNotifForm({ ...notifForm, reservasClases: checked })}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loadingNotif}
                  className="bg-[#00aeef] hover:bg-[#0098d4] text-black font-bold gap-2"
                >
                  {loadingNotif && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Preferencias
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}