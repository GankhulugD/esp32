"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Sunset, Moon, Utensils, Trash2 } from "lucide-react";
import {
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  serverTimestamp,
} from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";
import toast from "react-hot-toast";
import { useLang } from "@/lib/i18n";

const PORTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const PORTION_LABELS: Record<number, string> = {
  0.25: "1/4", 0.5: "1/2", 0.75: "3/4", 1.0: "1", 1.25: "1¼", 1.5: "1½", 2.0: "2",
};

type Schedule = {
  id: string;
  hour: number;
  minute: number;
  portionCups: number;
  label: string | null;
  enabled: boolean;
  createdAt: number;
};

function getTimeIcon(hour: number) {
  if (hour >= 5 && hour < 12) return <Sun size={16} className="text-brand" />;
  if (hour >= 12 && hour < 18) return <Sunset size={16} className="text-orange-400" />;
  return <Moon size={16} className="text-stone-500" />;
}

function fmt(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ESP32 уншдаг flat list-ийг идэвхтэй schedule-уудаас дахин барина
async function syncEsp32List(items: Schedule[]) {
  const enabled = items.filter((s) => s.enabled);
  const flat: Record<string, { hour: number; minute: number; cups: number }> = {};
  enabled.forEach((s, i) => {
    flat[`s${i}`] = { hour: s.hour, minute: s.minute, cups: s.portionCups };
  });
  await set(ref(firebaseDb, "feeder/schedules"), flat);
}

export default function SchedulePage() {
  const { t } = useLang();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New schedule form
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(30);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [portion, setPortion] = useState(0.75);
  const [portionIdx, setPortionIdx] = useState(2);

  // Firebase real-time subscribe
  useEffect(() => {
    const unsub = onValue(
      ref(firebaseDb, "feeder/schedules_app"),
      (snap) => {
        const val = (snap.val() ?? {}) as Record<string, Omit<Schedule, "id">>;
        const list: Schedule[] = Object.entries(val)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
        setSchedules(list);
        setLoading(false);
      },
      () => {
        toast.error(t.schedToastLoadFail);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [t]);

  const addSchedule = async () => {
    const h24 = ampm === "PM" ? (hour % 12) + 12 : hour % 12;
    setSaving(true);
    try {
      const label =
        h24 < 12 ? "Morning Meal" : h24 < 17 ? "Afternoon Snack" : "Evening Meal";
      const newRef = push(ref(firebaseDb, "feeder/schedules_app"));
      const payload = {
        hour: h24,
        minute,
        portionCups: portion,
        label,
        enabled: true,
        createdAt: serverTimestamp() as unknown as number,
      };
      await set(newRef, payload);
      // ESP32 list-ийг шууд шинэчил (optimistic local copy ашиглана)
      const optimistic: Schedule = {
        id: newRef.key!,
        ...payload,
        createdAt: Date.now(),
      };
      await syncEsp32List([...schedules, optimistic]);
      toast.success(t.schedToastAdded);
    } catch (e) {
      console.error(e);
      toast.error(t.schedToastAddFail);
    } finally {
      setSaving(false);
    }
  };

  const toggleSchedule = async (s: Schedule) => {
    try {
      await update(ref(firebaseDb, `feeder/schedules_app/${s.id}`), {
        enabled: !s.enabled,
      });
      const next = schedules.map((x) =>
        x.id === s.id ? { ...x, enabled: !x.enabled } : x,
      );
      await syncEsp32List(next);
    } catch {
      toast.error(t.schedToastUpdateFail);
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await remove(ref(firebaseDb, `feeder/schedules_app/${id}`));
      const next = schedules.filter((x) => x.id !== id);
      await syncEsp32List(next);
      toast.success(t.schedToastDeleted);
    } catch {
      toast.error(t.schedToastDeleteFail);
    }
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-[10px] text-brand-ink uppercase tracking-widest font-bold">{t.schedKicker}</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">{t.schedTitle}</h1>
      </div>

      {/* Add schedule card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">{t.schedAddCard}</p>
          <Utensils size={16} className="text-gray-400" />
        </div>

        {/* Time picker */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">{t.schedHour}</p>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3">
              <button onClick={() => setHour((h) => h === 1 ? 12 : h - 1)} className="text-gray-400 text-lg w-6">−</button>
              <span className="text-2xl font-bold text-gray-800">{String(hour).padStart(2, "0")}</span>
              <button onClick={() => setHour((h) => h === 12 ? 1 : h + 1)} className="text-gray-400 text-lg w-6">+</button>
            </div>
          </div>

          <span className="text-2xl font-bold text-gray-300 mt-5">:</span>

          <div className="flex-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">{t.schedMinutes}</p>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3">
              <button onClick={() => setMinute((m) => (m - 5 + 60) % 60)} className="text-gray-400 text-lg w-6">−</button>
              <span className="text-2xl font-bold text-gray-800">{String(minute).padStart(2, "0")}</span>
              <button onClick={() => setMinute((m) => (m + 5) % 60)} className="text-gray-400 text-lg w-6">+</button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-1">
            {(["AM", "PM"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setAmpm(v)}
                className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                  ampm === v ? "bg-brand text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Portion slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.schedPortionSize}</p>
            <span className="text-sm font-bold text-gray-800">{t.cupsLabel(PORTION_LABELS[portion])}</span>
          </div>
          <div className="relative">
            <div className="flex justify-between mb-1">
              {["¼", "½", "¾", "1", "1¼", "1½", "2"].map((l, i) => (
                <span key={i} className="text-[9px] text-gray-300 w-4 text-center">{l}</span>
              ))}
            </div>
            <input
              type="range" min={0} max={PORTIONS.length - 1} step={1}
              value={portionIdx}
              onChange={(e) => {
                const i = Number(e.target.value);
                setPortionIdx(i);
                setPortion(PORTIONS[i]);
              }}
              className="w-full accent-brand h-2 cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={addSchedule}
          disabled={saving}
          className="w-full py-3.5 bg-brand text-white rounded-xl font-semibold text-sm disabled:opacity-50 shadow-[0_6px_20px_rgba(255,193,0,0.35)]"
        >
          {saving ? t.schedSaving : t.schedConfirm}
        </button>
      </div>

      {/* Device status */}
      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand" />
        <span className="text-xs text-gray-600 font-medium">{t.schedDeviceLine}</span>
      </div>

      {/* Active schedules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">{t.schedActive}</p>
          <span className="text-xs text-brand-ink font-medium">
            {t.schedEventsProgrammed(schedules.filter((s) => s.enabled).length)}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {schedules.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                      {getTimeIcon(s.hour)}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-800">{fmt(s.hour, s.minute)}</p>
                      <p className="text-[11px] text-gray-400">
                        {t.schedCupPortion(PORTION_LABELS[s.portionCups])}
                      </p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => toggleSchedule(s)}
                      role="switch"
                      aria-checked={s.enabled}
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
                        s.enabled ? "bg-brand-mid" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-out ${
                          s.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteSchedule(s.id)}
                      aria-label="Delete schedule"
                      className="shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {schedules.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">{t.schedEmpty}</p>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
