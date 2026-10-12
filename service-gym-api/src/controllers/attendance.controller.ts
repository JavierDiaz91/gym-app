import { Response } from "express";
import { registerCheckIn } from "../services/attendance.service";
import { AuthenticatedRequest, getRequestGymId } from "../middlewares/auth";

export class AttendanceController {
  static async checkIn(req: AuthenticatedRequest, res: Response) {
    try {
      const gymId = getRequestGymId(req, req.body?.gymId);
      const { identifier } = req.body;

      if (!gymId || !identifier) {
        return res.status(400).json({
          success: false,
          error: "identifier es requerido y el gimnasio debe ser válido",
        });
      }

      const result = await registerCheckIn(gymId, String(identifier).trim());
      return res.json(result);
    } catch (error: any) {
      console.error("Error en checkIn:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
