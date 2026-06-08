import type { Response } from "express";

export function setPrivateCache(res: Response, seconds: number): void {
  res.setHeader("Cache-Control", `private, max-age=${seconds}, stale-while-revalidate=${Math.floor(seconds / 2)}`);
}
