import { Hono } from "hono";
import { desc, gte, sql } from "drizzle-orm";
import { createDb, feedingHistory, sensorReadings } from "../db";

type Env = {
  DB: D1Database;
  FIREBASE_DB_URL: string;
  FIREBASE_SECRET: string;
};

export const historyRoute = new Hono<{ Bindings: Env }>();

// GET /api/history?limit=20
historyRoute.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(feedingHistory)
    .orderBy(desc(feedingHistory.createdAt))
    .limit(limit);
  return c.json(rows);
});

// POST /api/history  — ESP32-с sensor уншилтаар дуудагдана (webhook)
historyRoute.post("/sensor", async (c) => {
  const body = await c.req.json<{
    foodLevel?: number;
    waterLevel?: number;
  }>();

  const db = createDb(c.env.DB);
  await db.insert(sensorReadings).values({
    foodLevel: body.foodLevel ?? null,
    waterLevel: body.waterLevel ?? null,
  });

  return c.json({ success: true });
});

// GET /api/history/stats  — Trends хуудасны өгөгдөл
historyRoute.get("/stats", async (c) => {
  const db = createDb(c.env.DB);
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  // Сүүлийн 7 хоногийн тэжээлийн нийт хэмжээ
  const [totals] = await db
    .select({
      totalCups: sql<number>`COALESCE(SUM(${feedingHistory.portionCups}), 0)`,
      feedCount: sql<number>`COUNT(*)`,
    })
    .from(feedingHistory)
    .where(gte(feedingHistory.createdAt, sevenDaysAgo));

  // Өдрийн дундаж тэжээлийн цаг (Unix timestamp-аас цаг гаргах)
  const avgHour = await db
    .select({
      avgHour: sql<number>`AVG((${feedingHistory.createdAt} % 86400) / 3600)`,
    })
    .from(feedingHistory)
    .where(gte(feedingHistory.createdAt, sevenDaysAgo));

  // Өдөр бүрийн тэжээлийн хэмжээ (graph-т)
  const dailyData = await db
    .select({
      day: sql<number>`(${feedingHistory.createdAt} / 86400) * 86400`,
      cups: sql<number>`SUM(${feedingHistory.portionCups})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(feedingHistory)
    .where(gte(feedingHistory.createdAt, sevenDaysAgo))
    .groupBy(sql`(${feedingHistory.createdAt} / 86400) * 86400`)
    .orderBy(sql`(${feedingHistory.createdAt} / 86400) * 86400`);

  // Сүүлийн 5 тэжээлийн түүх
  const recent = await db
    .select()
    .from(feedingHistory)
    .orderBy(desc(feedingHistory.createdAt))
    .limit(10);

  const avgHourVal = avgHour[0]?.avgHour ?? 7.75;
  const hours = Math.floor(avgHourVal);
  const minutes = Math.round((avgHourVal - hours) * 60);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return c.json({
    totalCups: Math.round((totals.totalCups ?? 0) * 10) / 10,
    feedCount: totals.feedCount ?? 0,
    avgFeedingTime: `${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`,
    dailyData,
    recent,
  });
});
