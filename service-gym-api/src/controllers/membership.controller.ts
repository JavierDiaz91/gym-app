import { Response } from "express";
import {
  getGymPlans,
  createGymPlan,
  updateGymPlan,
  deleteGymPlan,
  assignSubscription,
} from "../services/membership.service";
import { AuthenticatedRequest, getRequestGymId } from "../middlewares/auth";

function resolveGymId(req: AuthenticatedRequest): number | null {
  return getRequestGymId(req, req.query.gymId ?? req.body?.gymId);
}

export class MembershipController {
  static async getPlans(req: AuthenticatedRequest, res: Response) {
    try {
      const gymId = resolveGymId(req);
      if (!gymId) return res.status(400).json({ error: "gymId requerido" });

      const plans = await getGymPlans(gymId);
      return res.json(plans);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const gymId = resolveGymId(req);
      const { name, price, durationMonths, description } = req.body;

      if (!gymId || !name || price === undefined) {
        return res.status(400).json({ error: "Campos requeridos faltantes" });
      }

      const plan = await createGymPlan({
        gymId,
        name,
        price: Number(price),
        durationMonths: durationMonths ? Number(durationMonths) : 1,
        description: description || "",
      });

      return res.json({ success: true, plan });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updatePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const gymId = resolveGymId(req);
      if (!gymId) return res.status(400).json({ error: "gymId requerido" });

      const { id } = req.params;
      const { name, price, durationMonths, description, isActive } = req.body;

      const plan = await updateGymPlan(gymId, Number(id), {
        name,
        price: price === undefined ? undefined : Number(price),
        durationMonths:
          durationMonths === undefined ? undefined : Number(durationMonths),
        description,
        isActive: isActive === undefined ? undefined : Boolean(isActive),
      });

      if (!plan) return res.status(404).json({ error: "Plan no encontrado" });
      return res.json({ success: true, plan });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async deletePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const gymId = resolveGymId(req);
      if (!gymId) return res.status(400).json({ error: "gymId requerido" });

      const { id } = req.params;
      const plan = await deleteGymPlan(gymId, Number(id));
      if (!plan) return res.status(404).json({ error: "Plan no encontrado" });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async subscribeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const gymId = resolveGymId(req);
      const { memberId, planId, durationMonths } = req.body;

      if (!gymId || !memberId || !planId) {
        return res.status(400).json({
          error: "gymId, memberId y planId son obligatorios",
        });
      }

      const sub = await assignSubscription({
        gymId,
        memberId: Number(memberId),
        planId: Number(planId),
        durationMonths: durationMonths ? Number(durationMonths) : 1,
      });

      return res.json({ success: true, sub });
    } catch (error: any) {
      console.error("[SUBSCRIBE ERROR]:", error);
      return res.status(500).json({ error: error.message });
    }
  }

}
