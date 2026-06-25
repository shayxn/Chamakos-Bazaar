import express, { type Express } from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));

// Serve uploaded product images under /api/uploads so they are routed to this service
app.use("/api/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cookieSession({
    name: "chamak_session",
    secret: process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? (() => { throw new Error("SESSION_SECRET env var is required in production"); })() : "chamak_street_dev_only_secret"),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  }),
);

app.use("/api", router);

export default app;
