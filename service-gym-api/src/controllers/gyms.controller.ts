import { Request, Response } from 'express';
import { getAllGyms, createGymWithAdmin, toggleGymStatus } from '../services/gyms.service';

export class GymsController {
  static async list(req: Request, res: Response) {
    try {
      const gyms = await getAllGyms();
      return res.json({ success: true, data: gyms });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, slug, adminEmail, adminPasswordHash, adminFirstName, adminLastName } = req.body;
      
      if (!name || !slug || !adminEmail || !adminPasswordHash) {
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
      }

      const result = await createGymWithAdmin({
        name,
        slug,
        adminEmail,
        adminPasswordHash,
        adminFirstName,
        adminLastName
      });

      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await toggleGymStatus(Number(id), status);
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}