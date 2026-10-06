import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import cookieSession from "cookie-session";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requestSecurity } from "./lib/request-security";

const app: Express = express();
app.set("trust proxy", 1);

app.use(compression({ level: 6, threshold: 512 }));

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

app.use(requestSecurity);
app.use(cors({ origin: false, credentials: true }));

// Keep the historical production URLs and repository media working after the
// monorepo move. Existing root/persistent uploads remain the first choice.
const uploadRoots = [
  path.join(process.cwd(), "public", "uploads"),
  path.join(process.cwd(), "artifacts", "api-server", "public", "uploads"),
];
for (const root of uploadRoots) {
  app.use(["/api/uploads", "/uploads"], express.static(root));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret =
  process.env.SESSION_SECRET;
if (!sessionSecret) throw new Error("SESSION_SECRET must be configured.");

const isProduction = process.env.NODE_ENV === "production";

app.use(
  cookieSession({
    name: "chamak_session",
    secret: sessionSecret,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: isProduction,
    sameSite: "lax",
    httpOnly: true,
  }),
);

app.use("/api", router);

async function seedAdminUser() {
  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, "admin"));
    if (!existing) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        logger.warn("ADMIN_PASSWORD is not configured; admin account was not seeded");
        return;
      }
      const hash = await bcrypt.hash(adminPassword, 12);
      await db.insert(usersTable).values({
        username: "admin",
        passwordHash: hash,
        isAdmin: true,
      });
      logger.info("Admin user seeded successfully");
    } else {
      await db
        .update(usersTable)
        .set({ isAdmin: true })
        .where(eq(usersTable.id, existing.id));
      logger.info("Admin user authorization verified");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}

// Global error handler — catches any error thrown or passed via next(err) in route handlers
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled route error");
  if (res.headersSent) return;
  res.status(500).json({ error: "An unexpected error occurred. Please try again." });
});

seedAdminUser();

export default app;
