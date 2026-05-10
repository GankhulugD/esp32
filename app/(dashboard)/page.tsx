"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Utensils,
  Clock,
  Wifi,
  ChevronRight,
  Activity,
} from "lucide-react";
import Image from "next/image";
import { ref, onValue, set } from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";
import {
  parseFeedingHistory,
  pushFeedingHistoryEntry,
} from "@/lib/feederHistory";
import toast from "react-hot-toast";
import { useLang } from "@/lib/i18n";
import {
  pickNextFeeding,
  formatMealClock,
  type ScheduleTimesInput,
} from "@/lib/nextMeal";
import { LanguageSwitch } from "@/components/LanguageSwitch";

function CircleGauge({
  value,
  color,
  label,
  sublabel,
  remainingLabel,
}: {
  value: number;
  color: string;
  label: string;
  sublabel: string;
  remainingLabel: string;
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className="text-[11px] text-gray-300">{sublabel}</p>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">{value}%</span>
            <span className="text-[10px] text-gray-400">{remainingLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, lang } = useLang();
  const [foodLevel, setFoodLevel] = useState<number>(65);
  const [feeding, setFeeding] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastFed, setLastFed] = useState<string | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleTimesInput[]>([]);
  /** Рендерыг минут бүр сэргээж, дараагийн хоолны цаг зөв солигдоно */
  const [clockTick, setClockTick] = useState(0);
  const [recentActivity, setRecentActivity] = useState<
    {
      id: string;
      label: string;
      sub: string;
      amount: string;
      type: "feed" | "water";
    }[]
  >([]);

  // Firebase real-time
  useEffect(() => {
    const unsubs = [
      onValue(ref(firebaseDb, "feeder/food_level"), (s) => {
        const v = s.val();
        if (typeof v === "number") setFoodLevel(Math.round(v));
      }),
      onValue(ref(firebaseDb, "feeder/command"), (s) => {
        if (s.val() === 0) setFeeding(false);
      }),
      onValue(ref(firebaseDb, "feeder/updated_at"), (s) => {
        const v = s.val();
        if (v) {
          const secs = Math.floor((Date.now() - v) / 1000);
          setIsOnline(secs < 120);
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    const u = onValue(ref(firebaseDb, "feeder/schedules_app"), (snap) => {
      const val = (snap.val() ?? {}) as Record<
        string,
        { hour?: unknown; minute?: unknown; enabled?: unknown }
      >;
      setScheduleSlots(
        Object.values(val).map((v) => ({
          hour: Number(v.hour),
          minute: Number(v.minute),
          enabled: v.enabled !== false,
        })),
      );
    });
    return () => u();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setClockTick((n) => n + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  let nextMealLine = t.nextMealNone;
  {
    void clockTick;
    const next = pickNextFeeding(scheduleSlots);
    if (next) {
      const time = formatMealClock(next.hour, next.minute, lang);
      nextMealLine = next.isTomorrow ? t.nextMealTomorrow(time) : time;
    }
  }

  // Firebase түүх
  useEffect(() => {
    const u = onValue(ref(firebaseDb, "feeder/history"), (snap) => {
      const items = parseFeedingHistory(snap.val() as Record<string, unknown> | null)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);

      setRecentActivity(
        items.map((item) => ({
          id: item.id,
          label:
            item.triggeredBy === "manual" ? t.manualFeed : t.scheduledFeed,
          sub: new Date(item.createdAt * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          amount: `${item.portionCups * 240}g`,
          type: "feed" as const,
        })),
      );
      const first = items[0];
      if (first) {
        setLastFed(
          new Date(first.createdAt * 1000).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      }
    });
    return () => u();
  }, [t]);

  const handleFeed = async () => {
    if (feeding) return;
    try {
      setFeeding(true);
      const portionCups = 0.5;
      const runMs = portionCups * 1000;

      await set(ref(firebaseDb, "feeder/command"), 1);
      await set(ref(firebaseDb, "feeder/portion_cups"), portionCups);
      await pushFeedingHistoryEntry(firebaseDb, {
        portionCups,
        triggeredBy: "manual",
      });

      const now = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastFed(now);
      toast.success(t.feedingToast(portionCups, runMs / 1000));

      setTimeout(async () => {
        await set(ref(firebaseDb, "feeder/command"), 0);
      }, runMs + 1000);
    } catch {
      toast.error(t.failedSendCommand);
      setFeeding(false);
    }
  };

  const daysLeft = Math.round((foodLevel / 100) * 7);

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-full overflow-hidden flex items-center justify-center text-lg">
            <Image
              src="/Screenshot 2026-05-04 173742.png"
              alt="Pet avatar"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
              {isOnline ? `● ${t.online}` : `○ ${t.offline}`}
            </p>
            <p className="text-[11px] text-gray-400">
              {t.lastFeeding(lastFed ?? "—")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Bell size={22} className="text-gray-400" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-800">
        {t.petName} <span className="text-brand-ink">{t.petStatus}</span>
      </h1>

      {/* Feed Now button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleFeed}
        disabled={feeding}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
          feeding
            ? "bg-brand-light text-white cursor-not-allowed"
            : "bg-brand text-white shadow-[0_8px_28px_rgba(255,193,0,0.45)]"
        }`}
      >
        <Utensils size={18} />
        {feeding ? t.feeding : t.feedNow}
      </motion.button>

      {/* Food Level */}
      <CircleGauge
        value={foodLevel}
        color="#ffc100"
        label={t.foodLevel}
        sublabel={t.foodLevelSub}
        remainingLabel={t.remaining}
      />

      {/* Days left */}
      <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-600">
            {t.daysLeft(daysLeft)}
          </span>
        </p>
      </div>

      {/* Next meal */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex items-center gap-3">
        <Clock size={18} className="text-gray-400" />
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">
            {t.nextMeal}
          </p>
          <p className="text-lg font-bold text-gray-800">{nextMealLine}</p>
        </div>
      </div>

      {/* Device Health */}
      <div className="bg-brand rounded-2xl p-5 text-white space-y-3">
        <p className="font-semibold text-sm">{t.deviceHealth}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-brand-cream/90" />
            <span className="text-xs text-brand-cream/95">{t.wifiStrength}</span>
          </div>
          <span className="text-xs font-semibold">{t.wifiStrong}</span>
        </div>
        <div className="w-full bg-brand-mid rounded-full h-1.5">
          <div className="bg-white h-1.5 rounded-full w-4/5" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-brand-cream/90" />
            <span className="text-xs text-brand-cream/95">{t.firmware}</span>
          </div>
          <span className="text-xs font-semibold">v2.4.1</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-800 text-sm">
            {t.recentActivity}
          </p>
          <button className="text-xs text-brand-ink font-medium">
            {t.viewHistory}
          </button>
        </div>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              {t.noActivity}
            </p>
          ) : (
            recentActivity.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Utensils size={14} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{item.sub}</p>
                </div>
                <span className="text-xs font-bold text-gray-600">
                  {item.amount}
                </span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
