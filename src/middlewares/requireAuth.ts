
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Errors } from "../errors";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header) return null;


  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  return match[1]?.trim() || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json(Errors.unauthorized("Missing bearer token"));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {

    return res.status(500).json(Errors.internal("Missing JWT_SECRET"));
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string" || decoded == null) {
      return res.status(401).json(Errors.unauthorized("Invalid token payload"));
    }

    const sub = (decoded as jwt.JwtPayload).sub;


    const userId =
      typeof sub === "string" ? Number(sub) : typeof sub === "number" ? sub : NaN;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json(Errors.unauthorized("Invalid token subject"));
    }

    req.userId = userId;
    return next();
  } catch {
    return res.status(401).json(Errors.unauthorized("Invalid or expired token"));
  }
}
