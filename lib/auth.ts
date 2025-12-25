import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export function requireAuth(req: Request & { user?: { id: string } }, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

export default requireAuth;
