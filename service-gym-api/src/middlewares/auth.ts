import { createHmac, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import { sql } from "../db/neon";

export type UserRole = "superadmin" | "admin" | "trainer" | "member";

interface TokenPayload {
  id: number;
  email: string;
  role: UserRole;
  gymId: number | null;
  exp: number;
}

export interface AuthContext {
  userId: number;
  email: string;
  role: UserRole;
  gymId: number | null;
  gymStatus: string | null;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET debe estar definido y tener al menos 32 caracteres.");
  }
  return secret;
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const [encodedPayload, encodedSignature, ...rest] = token.split(".");
    if (!encodedPayload || !encodedSignature || rest.length > 0) return null;

    const expectedSignature = createHmac("sha256", getSessionSecret())
      .update(encodedPayload)
      .digest();

    const receivedSignature = decodeBase64Url(encodedSignature);

    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(
      decodeBase64Url(encodedPayload).toString("utf8")
    ) as TokenPayload;

    if (
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      !["superadmin", "admin", "trainer", "member"].includes(payload.role) ||
      (payload.gymId !== null && typeof payload.gymId !== "number") ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(req: Request): string | null {
  const authorization = req.header("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        error: "Autenticación requerida.",
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        code: "INVALID_SESSION",
        error: "Sesión inválida o expirada.",
      });
    }

    const rows = await sql`
      SELECT
        u.id,
        u.email,
        u.role,
        u.gym_id,
        g.status AS gym_status
      FROM users u
      LEFT JOIN gyms g ON g.id = u.gym_id
      WHERE u.id = ${payload.id}
      LIMIT 1
    `;

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        error: "Usuario no encontrado.",
      });
    }

    const role = user.role as UserRole;
    if (!["superadmin", "admin", "trainer", "member"].includes(role)) {
      return res.status(403).json({
        success: false,
        code: "INVALID_ROLE",
        error: "Rol no autorizado.",
      });
    }

    const gymId = user.gym_id == null ? null : Number(user.gym_id);

    if (role !== "superadmin" && gymId == null) {
      return res.status(403).json({
        success: false,
        code: "TENANT_REQUIRED",
        error: "El usuario no tiene un gimnasio asociado.",
      });
    }

    req.auth = {
      userId: Number(user.id),
      email: String(user.email),
      role,
      gymId,
      gymStatus: user.gym_status == null ? null : String(user.gym_status),
    };

    next();
  } catch (error) {
    console.error("Error autenticando request:", error);
    return res.status(500).json({
      success: false,
      code: "AUTH_ERROR",
      error: "No se pudo validar la sesión.",
    });
  }
}

export function getRequestGymId(
  req: AuthenticatedRequest,
  explicitGymId?: unknown
): number | null {
  if (!req.auth) return null;

  if (req.auth.role !== "superadmin") {
    return req.auth.gymId;
  }

  const parsed = Number(explicitGymId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        error: "Autenticación requerida.",
      });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        error: "No tenés permisos para realizar esta operación.",
      });
    }

    next();
  };
}

export function requireSameGymOrSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      code: "AUTH_REQUIRED",
      error: "Autenticación requerida.",
    });
  }

  if (req.auth.role === "superadmin") return next();

  const targetGymId = Number(req.params.id);
  if (!Number.isFinite(targetGymId) || targetGymId !== req.auth.gymId) {
    return res.status(404).json({
      success: false,
      error: "Recurso no encontrado.",
    });
  }

  next();
}
