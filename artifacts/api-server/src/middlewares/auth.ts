import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string) || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
};
