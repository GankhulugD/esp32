"use client";

import { useEffect, useState } from "react";
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
import { ref, onValue } from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";
import { api, type StatsResponse, type HistoryItem } from "@/lib/api/client";
import { useLang } from "@/lib/i18n";

function formatTime(unixSecs: number) {
  return new Date(unixSecs * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrendsPage() {
  const { t } = useLang();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [foodLevel, setFoodLevel] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const getDayLabel = (unixSecs: number) =>
    t.dayShort[new Date(unixSecs * 1000).getDay()];

  const formatDate = (unixSecs: number) => {
    const d = new Date(unixSecs * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString())
      return `${t.trendsToday}, ${formatTime(unixSecs)}`;
    if (d.toDateString() === yesterday.toDateString())
      return `${t.trendsYesterday}, ${formatTime(unixSecs)}`;
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      `, ${formatTime(unixSecs)}`
    );
  };

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return onValue(ref(firebaseDb, "feeder/food_level"), (s) => {
      const v = s.val();
      if (typeof v === "number") setFoodLevel(Math.round(v));
    });
  }, []);

  const chartData =
    stats?.dailyData.map((d) => ({
      day: getDayLabel(d.day),
      cups: Math.round(d.cups * 10) / 10,
    })) ?? [];

  const recentHistory = stats?.recent ?? [];

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="bg-blue-50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t.trendsBadge}
          </span>
          <span className="text-[10px] text-gray-400">{t.trendsLast7}</span>
          <TrendingUp size={16} className="text-gray-300" />
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
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {loading ? "—" : t.trendsCups(stats?.totalCups ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {t.trendsAvgTime}
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {loading ? "—" : (stats?.avgFeedingTime ?? "—")}
            </p>
          </div>
        </div>
      </div>

      {/* Tank level */}
      <div className="bg-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐱</span>
            <span className="text-sm font-semibold">{t.trendsTankLevel}</span>
          </div>
          <span className="text-[10px] bg-green-400/30 text-green-300 px-2 py-0.5 rounded-full font-semibold">
            ● {t.online}
          </span>
        </div>
        <p className="text-xs text-blue-200 mb-3">{t.trendsLastFilled}</p>
        <div className="bg-blue-500 rounded-xl h-10 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-blue-300/60 rounded-xl transition-all duration-1000"
            style={{ width: `${foodLevel}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold text-sm">{foodLevel}%</span>
          </div>
        </div>
        <button className="w-full mt-3 py-2.5 bg-white text-blue-600 rounded-xl font-semibold text-sm">
          {t.trendsFeedNow}
        </button>
      </div>

      {/* Consumption chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-800">
            {t.trendsConsumption}
          </p>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-gray-400">{t.trendsActual}</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mb-4">
          {t.trendsConsumptionSub}
        </p>
        {loading ? (
          <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -24, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
              <Bar dataKey="cups" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Feeding history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">
            {t.trendsHistory}
          </p>
          <button className="text-xs text-blue-500 font-medium">
            {t.trendsViewAll}
          </button>
        </div>
        <div className="space-y-2">
          {recentHistory.length === 0 && !loading ? (
            <p className="text-xs text-gray-400 text-center py-6">
              {t.trendsNoHistory}
            </p>
          ) : loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-100 rounded-2xl animate-pulse"
              />
            ))
          ) : (
            recentHistory.map((item: HistoryItem) => (
              <div
                key={item.id}
                className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    item.triggeredBy === "manual"
                      ? "bg-orange-100"
                      : "bg-blue-50"
                  }`}
                >
                  {item.triggeredBy === "manual" ? (
                    <Utensils size={15} className="text-orange-500" />
                  ) : (
                    <Clock size={15} className="text-blue-500" />
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
