import { Hono } from "hono";
import { firebaseGet, firebaseSet } from "../lib/firebase";

type Env = {
  DB: D1Database;
  FIREBASE_DB_URL: string;
  FIREBASE_SECRET: string;
};

export const deviceRoute = new Hono<{ Bindings: Env }>();

// GET /api/device/status  — Firebase-с live status авах
deviceRoute.get("/status", async (c) => {
  const raw = await firebaseGet(
    "feeder",
    c.env.FIREBASE_SECRET,
    c.env.FIREBASE_DB_URL
  );
  const data = raw as Record<string, unknown> | null;

  return c.json({
    foodLevel: typeof data?.food_level === "number" ? data.food_level : null,
    waterPump: !!data?.water_pump,
    feeding: data?.command === 1,
    lastImageUrl:
      typeof data?.frame_url === "string" ? data.frame_url : null,
    camIp: typeof data?.cam_ip === "string" ? data.cam_ip : null,
    updatedAt:
      typeof data?.updated_at === "number" ? data.updated_at : null,
  });
});

// POST /api/device/water-pump  — усны насос ON/OFF
deviceRoute.post("/water-pump", async (c) => {
  const body = await c.req.json<{ active: boolean }>();
  await firebaseSet(
    "feeder/water_pump",
    body.active ? 1 : 0,
    c.env.FIREBASE_SECRET,
    c.env.FIREBASE_DB_URL
  );
  return c.json({ success: true, active: body.active });
});
