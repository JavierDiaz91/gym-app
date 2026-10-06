import { Request, Response } from 'express';
import { 
  getAllGyms, 
  getGymById, 
  createGymWithAdmin, 
  toggleGymStatus,
  saveGymSchedulesAndHolidays,
  getGymSchedulesAndHolidays,
  updateGymGeneral
} from '../services/gyms.service';

export class GymsController {
  static async list(req: Request, res: Response) {
    try {
      const gyms = await getAllGyms();
      return res.json({ success: true, data: gyms });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const gym = await getGymById(Number(id));

      if (!gym) {
        return res.status(404).json({ success: false, error: 'Gimnasio no encontrado' });
      }

      return res.json({ success: true, data: gym });
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

  static async update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, phone, address, email } = req.body;

    const updatedGym = await updateGymGeneral(Number(id), { name, phone, address, email });

    if (!updatedGym) {
      return res.status(404).json({ success: false, error: 'Gimnasio no encontrado' });
    }

    return res.json({ success: true, data: updatedGym });
  } catch (error: any) {
    console.error("Error en update gym:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'El campo status es requerido' });
      }

      const updated = await toggleGymStatus(Number(id), status);

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Gimnasio no encontrado' });
      }

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error("Error en updateStatus:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getSchedules(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await getGymSchedulesAndHolidays(Number(id));
      
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error en getSchedules:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async saveSchedules(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { schedules, holidays } = req.body;

      if (!schedules || !Array.isArray(schedules)) {
        return res.status(400).json({ success: false, error: 'El formato de los horarios es inválido' });
      }

      const result = await saveGymSchedulesAndHolidays(Number(id), schedules, holidays || []);

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Error en saveSchedules:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}