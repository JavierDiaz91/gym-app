import { Request, Response } from "express";
import { 
  getGymPlans, 
  createGymPlan, 
  updateGymPlan, 
  deleteGymPlan,
  assignSubscription,
  assignMembershipToMember
} from "../services/membership.service";

export class MembershipController {
  static async getPlans(req: Request, res: Response) {
    try {
      const { gymId } = req.query;
      if (!gymId) return res.status(400).json({ error: "gymId es requerido" });

      const plans = await getGymPlans(Number(gymId));
      return res.json(plans);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createPlan(req: Request, res: Response) {
    try {
      const { gymId, name, price, durationMonths, description } = req.body;
      if (!gymId || !name || price === undefined) {
        return res.status(400).json({ error: "Campos requeridos faltantes: gymId, name, price" });
      }

      const plan = await createGymPlan({
        gymId: Number(gymId),
        name,
        price: Number(price),
        durationMonths: durationMonths ? Number(durationMonths) : 1, // Por defecto 1 mes
        description: description || "",
      });

      return res.json({ success: true, plan });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, price, durationMonths, description, isActive } = req.body;

      // Construimos el payload de actualización solo con los campos enviados
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = Number(price);
      if (durationMonths !== undefined) updateData.durationMonths = Number(durationMonths);
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const plan = await updateGymPlan(Number(id), updateData);

      return res.json({ success: true, plan });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async deletePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await deleteGymPlan(Number(id));
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async subscribeMember(req: Request, res: Response) {
    try {
      const { memberId, planId, durationMonths } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: "El memberId es obligatorio" });
      }

      // Si no envían planId o durationMonths, asignamos fallbacks seguros (Plan 1 y 1 Mes)
      const targetPlanId = planId ? Number(planId) : 1;
      const targetDuration = durationMonths ? Number(durationMonths) : 1;

      console.log(`[SUBSCRIBE] Asignando suscripción a Socio ID: ${memberId}, Plan ID: ${targetPlanId}`);

      const sub = await assignSubscription({
        memberId: Number(memberId),
        planId: targetPlanId,
        durationMonths: targetDuration,
      });

      return res.json({ success: true, sub });
    } catch (error: any) {
      console.error("[SUBSCRIBE ERROR]:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async assignMembership(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { membership_id } = req.body;

      if (!membership_id) {
        return res.status(400).json({ success: false, error: "El ID de la membresía es requerido" });
      }

      const updatedMember = await assignMembershipToMember(Number(id), Number(membership_id));

      return res.json({ success: true, data: updatedMember });
    } catch (error: any) {
      console.error("Error al asignar membresía:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}