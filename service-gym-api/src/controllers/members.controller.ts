import { Response } from "express";
import * as service from "../services/members.service";
import { AuthenticatedRequest, getRequestGymId } from "../middlewares/auth";

function resolveGymId(req: AuthenticatedRequest): number | null {
  return getRequestGymId(req, req.query.gymId ?? req.body?.gymId);
}

export async function getMembers(req: AuthenticatedRequest, res: Response) {
  const gymId = resolveGymId(req);
  if (!gymId) return res.status(400).json({ error: "gymId requerido" });

  const members = await service.getAllMembers(gymId);
  res.json(members);
}

export async function getMember(req: AuthenticatedRequest, res: Response) {
  const gymId = resolveGymId(req);
  if (!gymId) return res.status(400).json({ error: "gymId requerido" });

  const member = await service.getMemberById(gymId, Number(req.params.id));
  if (!member) return res.status(404).json({ message: "Not found" });

  if (
    req.auth?.role === "member" &&
    Number(member.user_id) !== req.auth.userId
  ) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json(member);
}

export async function createMember(req: AuthenticatedRequest, res: Response) {
  const gymId = resolveGymId(req);
  if (!gymId) return res.status(400).json({ error: "gymId requerido" });

  const member = await service.createMember(gymId, req.body);
  res.status(201).json(member);
}

export async function updateMember(req: AuthenticatedRequest, res: Response) {
  const gymId = resolveGymId(req);
  if (!gymId) return res.status(400).json({ error: "gymId requerido" });

  const member = await service.updateMember(gymId, Number(req.params.id), req.body);
  if (!member) return res.status(404).json({ message: "Not found" });
  res.json(member);
}

export async function deleteMember(req: AuthenticatedRequest, res: Response) {
  const gymId = resolveGymId(req);
  if (!gymId) return res.status(400).json({ error: "gymId requerido" });

  const deleted = await service.deleteMember(gymId, Number(req.params.id));
  if (!deleted) return res.status(404).json({ message: "Not found" });

  res.status(204).send();
}
