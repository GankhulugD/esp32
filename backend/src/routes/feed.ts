import { Hono } from "hono";
import { createDb, feedingHistory } from "../db";
import { firebaseSet, firebaseGet } from "../lib/firebase";

type Env = {
  DB: D1Database;
  FIREBASE_DB_URL: string;
  FIREBASE_SECRET: string;
};

export const feedRoute = new Hono<{ Bindings: Env }>();

// POST /api/feed  — гараар тэжээх
feedRoute.post("/", async (c) => {
  const body = await c.req.json<{ portionCups?: number }>();
  const portionCups = body.portionCups ?? 0.5;

  if (portionCups < 0.25 || portionCups > 2) {
    return c.json({ error: "portionCups must be between 0.25 and 2" }, 400);
  }

  // Firebase-д команд илгээх
  await firebaseSet(
    "feeder/command",
    1,
    c.env.FIREBASE_SECRET,
    c.env.FIREBASE_DB_URL
  );

  // Portion хэмжээг Firebase-д хадгалах
  await firebaseSet(
    "feeder/portion_cups",
    portionCups,
    c.env.FIREBASE_SECRET,
    c.env.FIREBASE_DB_URL
  );

  // Одоогийн хоолны түвшин авах
  const foodLevel = await firebaseGet(
    "feeder/food_level",
    c.env.FIREBASE_SECRET,
    c.env.FIREBASE_DB_URL
  ).catch(() => null);

  // D1-д лог хадгалах
  const db = createDb(c.env.DB);
  const [inserted] = await db
    .insert(feedingHistory)
    .values({
      portionCups,
      triggeredBy: "manual",
      foodLevelBefore: typeof foodLevel === "number" ? foodLevel : null,
    })
    .returning();

  return c.json({ success: true, historyId: inserted.id, portionCups });
});
