import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export function bearerAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = auth.slice(7);
  if (token !== env.apiBearerToken) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }
  next();
}
