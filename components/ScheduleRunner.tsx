"use client";

/**
 * Web-side fallback scheduler.
 *
 * ESP32 firmware-ийн scheduler нь үндсэн trigger юм. Энэ компонент нь
 * зөвхөн ESP32 офлайн (90 сек гаруй updated_at шинэчлэгдээгүй) үед
 * хариуцлага авна — энэ нь хөтөчийг нээлттэй үед давхар trigger хийхгүй.
 *
 * Олон таб нэгэн зэрэг нээлттэй үед давхар trigger болохоос сэргийлэхийн
 * тулд Firebase transaction ашиглан минут тус бүрд "claim" хийнэ.
 */

import { useEffect, useRef } from "react";
import { onValue, ref, runTransaction, serverTimestamp, set } from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";

const ESP32_ALIVE_THRESHOLD_MS = 90_000;

type Schedule = {
  id: string;
  hour: number;
  minute: number;
  portionCups: number;
  enabled: boolean;
};

const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function claimKey(now: Date, scheduleId: string) {
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  return `${y}${m}${d}-${hh}${mm}-${scheduleId}`;
}

export function ScheduleRunner() {
  const schedulesRef = useRef<Schedule[]>([]);
  const lastTickMinuteRef = useRef<string>("");
  const esp32UpdatedAtRef = useRef<number>(0);

  useEffect(() => {
    const unsub = onValue(ref(firebaseDb, "feeder/schedules_app"), (snap) => {
      const val = (snap.val() ?? {}) as Record<string, Omit<Schedule, "id">>;
      schedulesRef.current = Object.entries(val).map(([id, v]) => ({ id, ...v }));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(firebaseDb, "feeder/updated_at"), (snap) => {
      const v = snap.val();
      esp32UpdatedAtRef.current = typeof v === "number" ? v : 0;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const now = new Date();
      const minuteKey = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(
        now.getDate(),
      )}-${pad2(now.getHours())}${pad2(now.getMinutes())}`;

      if (lastTickMinuteRef.current === minuteKey) return;
      lastTickMinuteRef.current = minuteKey;

      // ESP32 firmware өөрөө scheduler ажиллуулдаг — энэ нь fallback тул
      // ESP32 онлайн үед бид триггер хийхгүй (давхар trigger-аас сэргийлэв)
      const esp32Alive =
        esp32UpdatedAtRef.current > 0 &&
        Date.now() - esp32UpdatedAtRef.current < ESP32_ALIVE_THRESHOLD_MS;
      if (esp32Alive) return;

      const due = schedulesRef.current.filter(
        (s) =>
          s.enabled && s.hour === now.getHours() && s.minute === now.getMinutes(),
      );
      if (due.length === 0) return;

      for (const s of due) {
        if (cancelled) return;
        const key = claimKey(now, s.id);
        const claim = ref(firebaseDb, `feeder/scheduled_runs/${key}`);
        try {
          const result = await runTransaction(claim, (current) => {
            if (current !== null) return; // өөр таб аль хэдийн авсан
            return { tab: TAB_ID, ts: Date.now() };
          });

          if (!result.committed) continue;
          const winner = result.snapshot.val()?.tab;
          if (winner !== TAB_ID) continue;

          await set(ref(firebaseDb, "feeder/portion_cups"), s.portionCups);
          await set(ref(firebaseDb, "feeder/command"), 1);

          // History лог Firebase-д
          const historyId = `${Date.now()}-${s.id}`;
          await set(ref(firebaseDb, `feeder/history/${historyId}`), {
            portionCups: s.portionCups,
            triggeredBy: "schedule",
            scheduleId: s.id,
            createdAt: serverTimestamp(),
          });

          const runMs = s.portionCups * 1000 + 1500;
          setTimeout(async () => {
            try {
              await set(ref(firebaseDb, "feeder/command"), 0);
            } catch {
              // ignore
            }
          }, runMs);
        } catch (e) {
          console.error("Schedule trigger failed:", e);
        }
      }
    };

    tick();
    const id = setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
