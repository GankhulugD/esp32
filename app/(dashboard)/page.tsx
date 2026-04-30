"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Utensils, Clock, Wifi, ChevronRight, Activity } from "lucide-react";
import { ref, onValue, set } from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";
import { api } from "@/lib/api/client";
import toast from "react-hot-toast";

function CircleGauge({
  value,
  color,
  label,
  sublabel,
}: {
  value: number;
  color: string;
  label: string;
  sublabel: string;
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
            <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle
              cx="60" cy="60" r={r} fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">{value}%</span>
            <span className="text-[10px] text-gray-400">REMAINING</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [foodLevel, setFoodLevel] = useState<number>(65);
  const [feeding, setFeeding] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastFed, setLastFed] = useState<string | null>(null);
  const [nextMeal, setNextMeal] = useState("5:00 PM");
  const [recentActivity, setRecentActivity] = useState<
    { id: number; label: string; sub: string; amount: string; type: "feed" | "water" }[]
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

  // Load recent history
  useEffect(() => {
    api.getHistory(5).then((items) => {
      setRecentActivity(
        items.map((item) => ({
          id: item.id,
          label: item.triggeredBy === "manual" ? "Manual Feed" : "Scheduled Feed",
          sub: new Date(item.createdAt * 1000).toLocaleDateString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          }),
          amount: `${item.portionCups * 240}g`,
          type: "feed" as const,
        }))
      );
      if (items[0]) {
        setLastFed(
          new Date(items[0].createdAt * 1000).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          })
        );
      }
    }).catch(() => {});
  }, []);

  const handleFeed = async () => {
    if (feeding) return;
    try {
      setFeeding(true);
      const portionCups = 0.5;
      const runMs = portionCups * 1000; // 1 cup = 1 second

      await set(ref(firebaseDb, "feeder/command"), 1);
      await set(ref(firebaseDb, "feeder/portion_cups"), portionCups);
      api.feed(portionCups).catch(() => {});

      const now = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
      });
      setLastFed(now);
      toast.success(`Feeding ${portionCups} cup — ${runMs / 1000}s`);

      // Device холбогдоогүй үед fallback: runMs-н дараа command-г 0 болгоно
      setTimeout(async () => {
        await set(ref(firebaseDb, "feeder/command"), 0);
      }, runMs + 1000); // +1s buffer ESP32-д зориулж
    } catch {
      toast.error("Failed to send command");
      setFeeding(false);
    }
  };

  const daysLeft = Math.round((foodLevel / 100) * 7);

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-lg">
            🐱
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
              {isOnline ? "● ONLINE" : "○ OFFLINE"}
            </p>
            <p className="text-[11px] text-gray-400">
              Last feeding: Today, {lastFed ?? "—"}
            </p>
          </div>
        </div>
        <Bell size={22} className="text-gray-400" />
      </div>

      <h1 className="text-3xl font-bold text-gray-800">
        Luna is{" "}
        <span className="text-blue-600">Happy</span>
      </h1>

      {/* Feed Now button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleFeed}
        disabled={feeding}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
          feeding
            ? "bg-blue-300 text-white cursor-not-allowed"
            : "bg-blue-600 text-white shadow-lg shadow-blue-200"
        }`}
      >
        <Utensils size={18} />
        {feeding ? "Feeding..." : "Feed Now"}
      </motion.button>

      {/* Food Level */}
      <CircleGauge
        value={foodLevel}
        color="#2563eb"
        label="Food Level"
        sublabel="Kibble Reservoir"
      />

      {/* Days left */}
      <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
        <p className="text-xs text-gray-400">
          Approx. <span className="font-semibold text-gray-600">{daysLeft} days left</span>
        </p>
      </div>

      {/* Next meal */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex items-center gap-3">
        <Clock size={18} className="text-gray-400" />
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">NEXT MEAL</p>
          <p className="text-lg font-bold text-gray-800">{nextMeal}</p>
        </div>
      </div>

      {/* Device Health */}
      <div className="bg-blue-600 rounded-2xl p-5 text-white space-y-3">
        <p className="font-semibold text-sm">Device Health</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-blue-200" />
            <span className="text-xs text-blue-100">WiFi Strength</span>
          </div>
          <span className="text-xs font-semibold">Strong</span>
        </div>
        <div className="w-full bg-blue-500 rounded-full h-1.5">
          <div className="bg-white h-1.5 rounded-full w-4/5" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-blue-200" />
            <span className="text-xs text-blue-100">Firmware</span>
          </div>
          <span className="text-xs font-semibold">v2.4.1</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-800 text-sm">Recent Activity</p>
          <button className="text-xs text-blue-500 font-medium">View History</button>
        </div>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
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
                  <p className="text-xs font-semibold text-gray-700 truncate">{item.label}</p>
                  <p className="text-[10px] text-gray-400">{item.sub}</p>
                </div>
                <span className="text-xs font-bold text-gray-600">{item.amount}</span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
