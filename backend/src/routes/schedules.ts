import { Hono } from "hono";
import { and, eq, isNotNull, notInArray } from "drizzle-orm";
import { createDb, feedingSchedules } from "../db";
import { firebasePatch } from "../lib/firebase";

type Env = {
  DB: D1Database;
  FIREBASE_DB_URL: string;
  FIREBASE_SECRET: string;
};

export const schedulesRoute = new Hono<{ Bindings: Env }>();

// GET /api/schedules
schedulesRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const schedules = await db
    .select()
    .from(feedingSchedules)
    .orderBy(feedingSchedules.hour, feedingSchedules.minute);
  return c.json(schedules);
});

type MirrorRow = {
  firebaseKey: string;
  hour: number;
  minute: number;
  portionCups: number;
  label?: string | null;
  enabled: boolean;
  createdAt?: number;
};

/** Next.js schedule хуудасны `feeder/schedules_app`-ийг D1-д толь тусгах → ESP32 `feeder/schedules`-тай синк */
schedulesRoute.post("/mirror", async (c) => {
  const body = await c.req.json<{ schedules: MirrorRow[] }>();
  const items = Array.isArray(body.schedules) ? body.schedules : [];

  for (const it of items) {
    const fk = typeof it.firebaseKey === "string" ? it.firebaseKey.trim() : "";
    if (
      fk.length === 0 ||
      it.hour < 0 ||
      it.hour > 23 ||
      it.minute < 0 ||
      it.minute > 59 ||
      it.portionCups < 0.25 ||
      it.portionCups > 2
    ) {
      return c.json({ error: "Invalid schedule row" }, 400);
    }
  }

  const db = createDb(c.env.DB);
  const keys = [...new Set(items.map((i) => i.firebaseKey.trim()))];

  if (keys.length === 0) {
    await db.delete(feedingSchedules).where(isNotNull(feedingSchedules.firebaseKey));
  } else {
    await db.delete(feedingSchedules).where(
      and(
        isNotNull(feedingSchedules.firebaseKey),
        notInArray(feedingSchedules.firebaseKey, keys),
      ),
    );
  }

  const nowTs = Math.floor(Date.now() / 1000);

  for (const it of items) {
    const fk = it.firebaseKey.trim();
    const created =
      typeof it.createdAt === "number" &&
      Number.isFinite(it.createdAt) &&
      it.createdAt > 0
        ? Math.floor(it.createdAt)
        : nowTs;

    await db
      .insert(feedingSchedules)
      .values({
        firebaseKey: fk,
        hour: it.hour,
        minute: it.minute,
        portionCups: it.portionCups,
        label: it.label ?? null,
        enabled: Boolean(it.enabled),
        createdAt: created,
      })
      .onConflictDoUpdate({
        target: feedingSchedules.firebaseKey,
        set: {
          hour: it.hour,
          minute: it.minute,
          portionCups: it.portionCups,
          label: it.label ?? null,
          enabled: Boolean(it.enabled),
        },
      });
  }

  await syncSchedulesToFirebase(db, c.env.FIREBASE_SECRET, c.env.FIREBASE_DB_URL);

  return c.json({ ok: true, count: items.length });
});

// POST /api/schedules
schedulesRoute.post("/", async (c) => {
  const body = await c.req.json<{
    hour: number;
    minute: number;
    portionCups: number;
    label?: string;
  }>();

  if (body.hour < 0 || body.hour > 23 || body.minute < 0 || body.minute > 59) {
    return c.json({ error: "Invalid time" }, 400);
  }
  if (body.portionCups < 0.25 || body.portionCups > 2) {
    return c.json({ error: "Invalid portion" }, 400);
  }

  const db = createDb(c.env.DB);
  const [inserted] = await db
    .insert(feedingSchedules)
    .values({
      hour: body.hour,
      minute: body.minute,
      portionCups: body.portionCups,
      label: body.label ?? null,
      enabled: true,
    })
    .returning();

  // Firebase-д schedule бичих (ESP32 шууд уншина)
  await syncSchedulesToFirebase(db, c.env.FIREBASE_SECRET, c.env.FIREBASE_DB_URL);

  return c.json(inserted, 201);
});

// PATCH /api/schedules/:id  — toggle enabled эсвэл цаг өөрчлөх
schedulesRoute.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Partial<{
    enabled: boolean;
    hour: number;
    minute: number;
    portionCups: number;
    label: string;
  }>>();

  const db = createDb(c.env.DB);
  const [updated] = await db
    .update(feedingSchedules)
    .set(body)
    .where(eq(feedingSchedules.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);

  await syncSchedulesToFirebase(db, c.env.FIREBASE_SECRET, c.env.FIREBASE_DB_URL);

  return c.json(updated);
});

// DELETE /api/schedules/:id
schedulesRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = createDb(c.env.DB);
  await db.delete(feedingSchedules).where(eq(feedingSchedules.id, id));

  await syncSchedulesToFirebase(db, c.env.FIREBASE_SECRET, c.env.FIREBASE_DB_URL);

  return c.json({ success: true });
});

// Firebase-д бүх идэвхтэй schedule-уудыг sync хийх
async function syncSchedulesToFirebase(
  db: ReturnType<typeof createDb>,
  token: string,
  dbUrl: string
) {
  const active = await db
    .select()
    .from(feedingSchedules)
    .where(eq(feedingSchedules.enabled, true));

  const firebaseSchedules: Record<string, { hour: number; minute: number; cups: number }> = {};
  active.forEach((s, i) => {
    firebaseSchedules[`s${i}`] = {
      hour: s.hour,
      minute: s.minute,
      cups: s.portionCups,
    };
  });

  await firebasePatch("feeder/schedules", firebaseSchedules, token, dbUrl);
}
