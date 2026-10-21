import { sql } from "../db/neon";

/**
 * Registra el ingreso de un socio al gimnasio mediante QR.
 *
 * La validación y el registro se realizan de forma atómica
 * en PostgreSQL mediante register_gym_checkin_v2.
 *
 * Controla:
 * - Gimnasio al que pertenece el socio.
 * - Membresía vigente y pagada.
 * - Vencimiento de pases diarios y mensuales.
 * - Cupos disponibles en packs de ingresos.
 * - Escaneos duplicados dentro de 60 segundos.
 * - Asociación de asistencia con subscription_id.
 */
export async function registerCheckIn(
  gymId: number,
  identifier: string
) {
  if (!Number.isInteger(gymId) || gymId <= 0) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: "Identificador de gimnasio inválido",
    };
  }

  if (
    typeof identifier !== "string" ||
    identifier.trim().length === 0
  ) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: "Identificador del socio obligatorio",
    };
  }

  const [row] = await sql`
    SELECT public.register_gym_checkin_v2(
      ${gymId}::bigint,
      ${identifier.trim()}::text
    ) AS result
  `;

  if (!row || !row.result) {
    throw new Error(
      "No se obtuvo respuesta del control de acceso"
    );
  }

  const result =
    typeof row.result === "string"
      ? JSON.parse(row.result)
      : row.result;

  return result;
}