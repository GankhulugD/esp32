import type { Lang } from "@/lib/i18n";

export type ScheduleTimesInput = {
  hour: number;
  minute: number;
  enabled: boolean;
};

/** Өнөөдөр эсвэл маргаашийн дараагийн цаг (минут түвшинд) */
export function pickNextFeeding(
  slots: ScheduleTimesInput[],
  now = new Date(),
): { hour: number; minute: number; isTomorrow: boolean } | null {
  const list = slots
    .filter((s) => s.enabled && Number.isFinite(s.hour) && Number.isFinite(s.minute))
    .map((s) => {
      const hour = ((Math.floor(s.hour) % 24) + 24) % 24;
      const minute = ((Math.floor(s.minute) % 60) + 60) % 60;
      const m = hour * 60 + minute;
      return { m, hour, minute };
    })
    .sort((a, b) => a.m - b.m);

  if (!list.length) return null;

  const nowM = now.getHours() * 60 + now.getMinutes();
  const hit = list.find((x) => x.m >= nowM);
  if (hit) return { hour: hit.hour, minute: hit.minute, isTomorrow: false };
  const first = list[0];
  return { hour: first.hour, minute: first.minute, isTomorrow: true };
}

export function formatMealClock(
  hour: number,
  minute: number,
  lang: Lang,
): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(lang === "mn" ? "mn-MN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
