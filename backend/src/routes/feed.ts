import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb, feedingHistory, feedingSchedules } from "../db";
import { firebaseGet, firebaseSet } from "../lib/firebase";

type Env = {
  DB: D1Database;
  FIREBASE_DB_URL: string;
  FIREBASE_SECRET: string;
};

export const feedRoute = new Hono<{ Bindings: Env }>();

// POST /api/feed — гараар тэжээх (эсвэл logOnly: зөвхөн D1 түүх; ScheduleRunner аль хэдийн Firebase команд илгээсэн үед)
feedRoute.post("/", async (c) => {
  const body = await c.req.json<{
    portionCups?: number;
    triggeredBy?: "manual" | "schedule";
    scheduleFirebaseKey?: string | null;
    logOnly?: boolean;
  }>();
  const portionCups = body.portionCups ?? 0.5;
  const logOnly = body.logOnly === true;
  const triggeredBy =
    body.triggeredBy === "schedule" ? "schedule" : "manual";

  if (portionCups < 0.25 || portionCups > 2) {
    return c.json({ error: "portionCups must be between 0.25 and 2" }, 400);
  }

  const db = createDb(c.env.DB);

  if (!logOnly) {
    await firebaseSet(
      "feeder/command",
      1,
      c.env.FIREBASE_SECRET,
      c.env.FIREBASE_DB_URL,
    );
    await firebaseSet(
      "feeder/portion_cups",
      portionCups,
      c.env.FIREBASE_SECRET,
      c.env.FIREBASE_DB_URL,
    );
  }

  const foodLevel = await firebaseGet(
    "feeder/food_level",
    c.env.FIREBASE_SECRET,
    c.env.FIREBASE_DB_URL,
  ).catch(() => null);

  let scheduleIdNum: number | null = null;
  if (triggeredBy === "schedule" && body.scheduleFirebaseKey) {
    const [row] = await db
      .select({ id: feedingSchedules.id })
      .from(feedingSchedules)
      .where(eq(feedingSchedules.firebaseKey, body.scheduleFirebaseKey))
      .limit(1);
    scheduleIdNum = row?.id ?? null;
  }

  const [inserted] = await db
    .insert(feedingHistory)
    .values({
      portionCups,
      triggeredBy,
      scheduleId: scheduleIdNum,
      scheduleFirebaseKey: body.scheduleFirebaseKey ?? null,
      foodLevelBefore: typeof foodLevel === "number" ? foodLevel : null,
    })
    .returning();

  return c.json({
    success: true,
    historyId: inserted.id,
    portionCups,
    triggeredBy,
  });
});
