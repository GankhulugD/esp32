import { createDb, sensorReadings } from "../db";
import { firebaseGet } from "../lib/firebase";
import type { Env } from "../types/env";

/** Firebase `feeder`-ийн хэмжилтийг D1 `sensor_readings` дээр snapshot (давхар архив). */
export async function snapshotFeederToD1(env: Env): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = (await firebaseGet(
      "feeder",
      env.FIREBASE_SECRET,
      env.FIREBASE_DB_URL,
    )) as Record<string, unknown> | null;

    const food = typeof data?.food_level === "number" ? data.food_level : null;
    const db = createDb(env.DB);
    await db.insert(sensorReadings).values({
      foodLevel: food,
      waterLevel: null,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/** Cron: feeder snapshot → D1 `sensor_readings`. */
export async function runScheduledMirror(env: Env): Promise<void> {
  const snap = await snapshotFeederToD1(env);
  if (!snap.ok) console.error("[cron] snapshot:", snap.error);
  else console.log("[cron] sensor_readings snapshot OK");
}
