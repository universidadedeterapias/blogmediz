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

export function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!env.adminSecret) {
    res.status(503).json({ error: "Admin not configured (ADMIN_SECRET)" });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  if (auth.slice(7) !== env.adminSecret) {
    res.status(403).json({ error: "Invalid admin token" });
    return;
  }
  next();
}
