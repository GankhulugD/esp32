import {
  push,
  ref,
  serverTimestamp,
  set,
  type Database,
} from "firebase/database";

export type FeedingHistoryEntry = {
  id: string;
  portionCups: number;
  triggeredBy: "manual" | "schedule";
  scheduleId?: string;
  /** Unix секунд */
  createdAt: number;
};

/** RTDB Timestamp / милли секундыг секунд болгоно */
export function firebaseTimeToUnixSeconds(ts: unknown): number {
  if (typeof ts === "number") {
    if (!Number.isFinite(ts)) return Math.floor(Date.now() / 1000);
    return ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
  }
  if (ts && typeof ts === "object") {
    if ("seconds" in ts && typeof (ts as { seconds: number }).seconds === "number")
      return Math.floor((ts as { seconds: number }).seconds);
    if ("_seconds" in ts && typeof (ts as { _seconds: number })._seconds === "number")
      return Math.floor((ts as { _seconds: number })._seconds);
  }
  return Math.floor(Date.now() / 1000);
}

export function parseFeedingHistory(
  val: Record<string, unknown> | null,
): FeedingHistoryEntry[] {
  if (!val) return [];
  const out: FeedingHistoryEntry[] = [];
  for (const [id, raw] of Object.entries(val)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const portion = row.portionCups;
    if (typeof portion !== "number") continue;
    const triggeredBy =
      row.triggeredBy === "schedule" ? "schedule" : "manual";
    out.push({
      id,
      portionCups: portion,
      triggeredBy,
      scheduleId:
        typeof row.scheduleId === "string" ? row.scheduleId : undefined,
      createdAt: firebaseTimeToUnixSeconds(row.createdAt),
    });
  }
  return out;
}

/** `feeder/history`-д Push (Trends/Home «Feed now» + Schedule runner ижил газар) */
export async function pushFeedingHistoryEntry(
  db: Database,
  params: {
    portionCups: number;
    triggeredBy: "manual" | "schedule";
    scheduleId?: string | null;
  },
): Promise<void> {
  const r = push(ref(db, "feeder/history"));
  await set(r, {
    portionCups: params.portionCups,
    triggeredBy: params.triggeredBy,
    ...(params.scheduleId ? { scheduleId: params.scheduleId } : {}),
    createdAt: serverTimestamp(),
  });
}

export type FeedingTrendsSchedule = {
  id: string;
  hour: number;
  minute: number;
  portionCups: number;
  label: string | null;
  enabled: boolean;
};

export function parseSchedulesApp(
  val: Record<string, unknown> | null,
): FeedingTrendsSchedule[] {
  if (!val) return [];
  const list: FeedingTrendsSchedule[] = [];
  for (const [id, raw] of Object.entries(val)) {
    if (!raw || typeof raw !== "object") continue;
    const v = raw as Record<string, unknown>;
    const hour = v.hour;
    const minute = v.minute;
    const portionCups = v.portionCups;
    if (
      typeof hour !== "number" ||
      typeof minute !== "number" ||
      typeof portionCups !== "number"
    )
      continue;
    list.push({
      id,
      hour,
      minute,
      portionCups,
      label: typeof v.label === "string" ? v.label : null,
      enabled: v.enabled !== false,
    });
  }
  list.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  return list;
}

/** Сүүлийн 7 өдөр + график/дундаж */
export function computeTrendsFromHistory(entries: FeedingHistoryEntry[]): {
  totalCups: number;
  feedCount: number;
  avgFeedingTime: string;
  dailyData: { day: number; cups: number; count: number }[];
  recent: FeedingHistoryEntry[];
} {
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = now - 7 * 86400;

  const inWeek = entries.filter((e) => e.createdAt >= sevenDaysAgo);
  let totalCups = 0;
  let secsInDaySum = 0;
  const dayBuckets = new Map<number, { cups: number; count: number }>();

  for (const e of inWeek) {
    totalCups += e.portionCups;
    const d = new Date(e.createdAt * 1000);
    const dayStart = Math.floor(
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000,
    );
    const cur = dayBuckets.get(dayStart) ?? { cups: 0, count: 0 };
    cur.cups += e.portionCups;
    cur.count += 1;
    dayBuckets.set(dayStart, cur);

    const sod = new Date(e.createdAt * 1000);
    const mid = sod.getHours() * 3600 + sod.getMinutes() * 60 + sod.getSeconds();
    secsInDaySum += mid;
  }

  const feedCount = inWeek.length;
  let avgFeedingTime = "—";
  if (feedCount > 0) {
    const avgSecs = secsInDaySum / feedCount;
    const h24 = Math.floor(avgSecs / 3600) % 24;
    const mins = Math.round((avgSecs % 3600) / 60) % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const hh = h24 % 12 || 12;
    avgFeedingTime = `${hh}:${String(mins).padStart(2, "0")} ${ampm}`;
  }

  const dailyData = [...dayBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, agg]) => ({
      day,
      cups: Math.round(agg.cups * 10) / 10,
      count: agg.count,
    }));

  const recent = [...entries]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);

  return {
    totalCups: Math.round(totalCups * 10) / 10,
    feedCount,
    avgFeedingTime,
    dailyData,
    recent,
  };
}
