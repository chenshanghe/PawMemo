import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import fs from "fs";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// ── Static file serving (production only) ────────────────────────────────────
// In production the Vite app is pre-built to artifacts/travel-diary/dist/public/.
// Express must serve those files and fall back to index.html for SPA routing.
if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(import.meta.dirname, "../../travel-diary/dist/public");
  const indexHtml = path.join(staticDir, "index.html");

  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { maxAge: "1y", immutable: true, index: false }));

    // SPA fallback — serve index.html for any non-file route
    app.use((_req: Request, res: Response) => {
      if (fs.existsSync(indexHtml)) {
        res.setHeader("Cache-Control", "no-cache");
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Not found");
      }
    });
  }
}

// Global async error handler — catches unhandled promise rejections from route handlers
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err, "Unhandled route error");
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;
