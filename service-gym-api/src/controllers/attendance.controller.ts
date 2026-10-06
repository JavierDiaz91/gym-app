import { Request, Response } from "express";
import { registerCheckIn } from "../services/attendance.service";

export class AttendanceController {
  static async checkIn(req: Request, res: Response) {
    try {
      const { gymId, identifier } = req.body;

      if (!gymId || !identifier) {
        return res.status(400).json({ success: false, error: "gymId e identifier son requeridos" });
      }

      const result = await registerCheckIn(Number(gymId), String(identifier).trim());
      return res.json(result);
    } catch (error: any) {
      console.error("Error en checkIn:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}