"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Utensils, Clock, ChevronRight } from "lucide-react";
import { ref, onValue, set } from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";
import { useLang } from "@/lib/i18n";
import toast from "react-hot-toast";
import {
  computeTrendsFromHistory,
  parseFeedingHistory,
  parseSchedulesApp,
  pushFeedingHistoryEntry,
  type FeedingHistoryEntry,
  type FeedingTrendsSchedule,
} from "@/lib/feederHistory";

function formatTimeUnixSecs(unixSecs: number) {
  return new Date(unixSecs * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtSched(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function TrendsPage() {
  const { t } = useLang();
  const [historyEntries, setHistoryEntries] = useState<FeedingHistoryEntry[]>(
    [],
  );
  const [schedulesList, setSchedulesList] = useState<FeedingTrendsSchedule[]>(
    [],
  );
  const [statsLoading, setStatsLoading] = useState(true);

  const [foodLevel, setFoodLevel] = useState<number>(0);
  const [feeding, setFeeding] = useState(false);

  const firebaseStats = useMemo(
    () => computeTrendsFromHistory(historyEntries),
    [historyEntries],
  );

  const getDayLabel = (unixSecs: number) =>
    t.dayShort[new Date(unixSecs * 1000).getDay()];

  const formatDate = (unixSecs: number) => {
    const d = new Date(unixSecs * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString())
      return `${t.trendsToday}, ${formatTimeUnixSecs(unixSecs)}`;
    if (d.toDateString() === yesterday.toDateString())
      return `${t.trendsYesterday}, ${formatTimeUnixSecs(unixSecs)}`;
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      `, ${formatTimeUnixSecs(unixSecs)}`
    );
  };

  useEffect(() => {
    const u = onValue(
      ref(firebaseDb, "feeder/history"),
      (snap) => {
        setHistoryEntries(
          parseFeedingHistory(snap.val() as Record<string, unknown> | null),
        );
        setStatsLoading(false);
      },
      () => setStatsLoading(false),
    );
    return () => u();
  }, []);

  useEffect(() => {
    const u = onValue(ref(firebaseDb, "feeder/schedules_app"), (snap) => {
      setSchedulesList(
        parseSchedulesApp(snap.val() as Record<string, unknown> | null),
      );
    });
    return () => u();
  }, []);

  const handleTrendsFeed = async () => {
    if (feeding) return;
    const portionCups = 0.5;
    const runMs = portionCups * 1000;
    try {
      setFeeding(true);
      await set(ref(firebaseDb, "feeder/command"), 1);
      await set(ref(firebaseDb, "feeder/portion_cups"), portionCups);
      await pushFeedingHistoryEntry(firebaseDb, {
        portionCups,
        triggeredBy: "manual",
      });
      toast.success(t.feedingToast(portionCups, runMs / 1000));
      setTimeout(async () => {
        await set(ref(firebaseDb, "feeder/command"), 0);
      }, runMs + 1000);
    } catch {
      toast.error(t.failedSendCommand);
      setFeeding(false);
    }
  };

  useEffect(() => {
    return onValue(ref(firebaseDb, "feeder/food_level"), (s) => {
      const v = s.val();
      if (typeof v === "number") setFoodLevel(Math.round(v));
    });
  }, []);

  useEffect(() => {
    return onValue(ref(firebaseDb, "feeder/command"), (s) => {
      if (s.val() === 0) setFeeding(false);
    });
  }, []);

  const chartData =
    firebaseStats.dailyData.map((d) => ({
      day: getDayLabel(d.day),
      cups: Math.round(d.cups * 10) / 10,
    })) ?? [];

  const recentHistory = firebaseStats.recent;

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="bg-brand-soft rounded-2xl p-5 border border-brand-light/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] bg-brand-light text-brand-ink font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t.trendsBadge}
          </span>
          <span className="text-[10px] text-gray-400">{t.trendsLast7}</span>
          <TrendingUp size={16} className="text-brand-mid" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 leading-tight mt-2">
          {t.trendsWeekly1}
          <br />
          {t.trendsWeekly2}
        </h2>
        <p className="text-xs text-gray-500 mt-1">{t.trendsSubtitle}</p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {t.trendsTotalConsumed}
            </p>
            <p className="text-2xl font-bold text-brand-ink mt-1">
              {statsLoading ? "—" : t.trendsCups(firebaseStats.totalCups)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {t.trendsAvgTime}
            </p>
            <p className="text-2xl font-bold text-brand-ink mt-1">
              {statsLoading ? "—" : firebaseStats.avgFeedingTime}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-brand rounded-2xl p-5 text-white shadow-[0_8px_28px_rgba(255,193,0,0.35)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐱</span>
            <span className="text-sm font-semibold">{t.trendsTankLevel}</span>
          </div>
          <span className="text-[10px] bg-lime-400/25 text-lime-100 px-2 py-0.5 rounded-full font-semibold">
            ● {t.online}
          </span>
        </div>
        <p className="text-xs text-brand-cream/95 mb-3">{t.trendsLastFilled}</p>
        <div className="bg-brand-mid rounded-xl h-10 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-brand-light/90 rounded-xl transition-all duration-1000"
            style={{ width: `${foodLevel}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold text-sm drop-shadow-sm">{foodLevel}%</span>
          </div>
        </div>
        <button
          type="button"
          disabled={feeding}
          onClick={() => void handleTrendsFeed()}
          className={`w-full mt-3 py-2.5 rounded-xl font-semibold text-sm ${
            feeding
              ? "bg-brand-light text-white cursor-not-allowed"
              : "bg-brand-cream text-brand-ink"
          }`}
        >
          {feeding ? t.feeding : t.trendsFeedNow}
        </button>
      </div>

      <div className="bg-brand-cream rounded-2xl p-5 shadow-sm border border-brand-soft">
        <p className="text-sm font-semibold text-gray-800">
          {t.trendsSchedBlock}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 mb-3">
          {t.trendsSchedSub}
        </p>
        {schedulesList.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {t.trendsSchedEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {schedulesList.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-brand-soft/70 px-3 py-2.5 bg-brand-cream"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock size={14} className="text-brand shrink-0" />
                  <span className="text-xs font-semibold text-gray-800">
                    {fmtSched(s.hour, s.minute)}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded ${
                      s.enabled
                        ? "bg-lime-100 text-lime-800"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {s.enabled ? t.online : t.offline}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-600 shrink-0">
                  {t.trendsCupsLabel(s.portionCups)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-brand-cream rounded-2xl p-5 shadow-sm border border-brand-soft">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-800">
            {t.trendsConsumption}
          </p>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span className="text-[10px] text-gray-400">{t.trendsActual}</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mb-4">
          {t.trendsConsumptionSub}
        </p>
        {statsLoading ? (
          <div className="h-32 bg-brand-soft/40 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-xs text-gray-400">
            {t.trendsNoHistory}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -24, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffebab" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "none",
                  borderRadius: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  fontSize: 11,
                }}
                formatter={(v) => [t.trendsCups(Number(v)), t.trendsConsumed]}
              />
              <Bar dataKey="cups" fill="#ffc100" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">
            {t.trendsHistory}
          </p>
          <button type="button" className="text-xs text-brand-ink font-semibold">
            {t.trendsViewAll}
          </button>
        </div>
        <div className="space-y-2">
          {recentHistory.length === 0 && !statsLoading ? (
            <p className="text-xs text-gray-400 text-center py-6">
              {t.trendsNoHistory}
            </p>
          ) : statsLoading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-brand-soft/50 rounded-2xl animate-pulse"
              />
            ))
          ) : (
            recentHistory.map((item) => (
              <div
                key={item.id}
                className="bg-brand-cream rounded-xl px-4 py-3 shadow-sm border border-brand-soft flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    item.triggeredBy === "manual"
                      ? "bg-orange-100"
                      : "bg-brand-soft/40"
                  }`}
                >
                  {item.triggeredBy === "manual" ? (
                    <Utensils size={15} className="text-orange-500" />
                  ) : (
                    <Clock size={15} className="text-brand" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">
                    {item.triggeredBy === "manual"
                      ? t.trendsManualSnack
                      : t.trendsScheduledMeal}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-700">
                  {t.trendsCupsLabel(item.portionCups)}
                </span>
                <ChevronRight size={13} className="text-gray-300" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
