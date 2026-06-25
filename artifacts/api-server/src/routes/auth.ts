import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";

const router = Router();

const BCRYPT_ROUNDS = 12;

function legacySha256Hash(password: string): string {
  return crypto.createHash("sha256").update(password + "chamak_salt_2024").digest("hex");
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("$2")) {
    return bcrypt.compare(password, storedHash);
  }
  return storedHash === legacySha256Hash(password);
}

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!user.passwordHash.startsWith("$2")) {
    const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  }

  (req.session as Record<string, unknown>).userId = user.id;
  res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
});

router.post("/auth/logout", (req, res) => {
  req.session = null;
  res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res) => {
  const session = req.session as Record<string, unknown>;
  const userId = session?.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
});

export default router;
