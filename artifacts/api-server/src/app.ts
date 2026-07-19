import express, { type Express } from "express";
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

app.use(cors({ origin: true, credentials: true }));

app.use("/api/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret =
  process.env.SESSION_SECRET ?? "chamak_street_fallback_secret_2024_do_not_use_in_prod";

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
    const adminPassword = process.env.ADMIN_PASSWORD ?? "chamak2024";
    const hash = await bcrypt.hash(adminPassword, 12);
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, "admin"));
    if (!existing) {
      await db.insert(usersTable).values({
        username: "admin",
        passwordHash: hash,
        isAdmin: true,
      });
      logger.info("Admin user seeded successfully");
    } else {
      await db
        .update(usersTable)
        .set({ passwordHash: hash, isAdmin: true })
        .where(eq(usersTable.id, existing.id));
      logger.info("Admin user credentials synced");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}

seedAdminUser();

export default app;
