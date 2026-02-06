import { Request, Response } from "express";
import * as service from "../services/members.service";

export async function getMembers(req: Request, res: Response) {
  const members = await service.getAllMembers();
  res.json(members);
}

export async function getMember(req: Request, res: Response) {
  const member = await service.getMemberById(Number(req.params.id));
  if (!member) return res.status(404).json({ message: "Not found" });
  res.json(member);
}

export async function createMember(req: Request, res: Response) {
  const member = await service.createMember(req.body);
  res.status(201).json(member);
}

export async function updateMember(req: Request, res: Response) {
  const member = await service.updateMember(Number(req.params.id), req.body);
  res.json(member);
}

export async function deleteMember(req: Request, res: Response) {
  await service.deleteMember(Number(req.params.id));
  res.status(204).send();
}
