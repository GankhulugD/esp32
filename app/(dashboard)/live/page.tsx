"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Utensils, Cloud } from "lucide-react";
import { ref, onValue, set } from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";
import { api } from "@/lib/api/client";
import toast from "react-hot-toast";
import { useLang } from "@/lib/i18n";

export default function LivePage() {
  const { t } = useLang();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [camIp, setCamIp] = useState<string | null>(null);
  const [feeding, setFeeding] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [storageUsed] = useState(82);
  const prevUrlRef = useRef("");

  useEffect(() => {
    const unsubs = [
      onValue(ref(firebaseDb, "feeder/frame_url"), (s) => {
        const url = s.val() as string | null;
        if (!url) return;
        setUpdatedAt(new Date());
        setImageUrl(url + "?cb=" + Date.now());
      }),
      onValue(ref(firebaseDb, "feeder/cam_ip"), (s) => {
        const ip = s.val();
        if (ip) setCamIp(ip);
      }),
      onValue(ref(firebaseDb, "feeder/command"), (s) => {
        if (s.val() === 0) setFeeding(false);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Seconds ticker
  useEffect(() => {
    if (!updatedAt) return;
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - updatedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);

  // Latency ping
  useEffect(() => {
    const ping = async () => {
      const start = Date.now();
      await fetch("/api/ping").catch(() => {});
      setLatency(Date.now() - start);
    };
    const id = setInterval(ping, 5000);
    ping();
    return () => clearInterval(id);
  }, []);

  const isOnline = !!updatedAt && secondsAgo < 120;

  const handleRefresh = () => {
    setImageUrl(null);
    setTimeout(() => {
      onValue(ref(firebaseDb, "feeder/frame_url"), (s) => {
        const url = s.val();
        if (url) setImageUrl(url + "?cb=" + Date.now());
      }, { onlyOnce: true });
    }, 300);
    toast(t.liveToastRefreshing, { icon: "🔄" });
  };

  const handleQuickFeed = async () => {
    if (feeding) return;
    try {
      setFeeding(true);
      const portionCups = 0.5;
      await set(ref(firebaseDb, "feeder/command"), 1);
      await set(ref(firebaseDb, "feeder/portion_cups"), portionCups);
      api.feed(portionCups).catch(() => {});
      toast.success(t.liveToastQuickFeed(portionCups));
      setTimeout(async () => {
        await set(ref(firebaseDb, "feeder/command"), 0);
      }, portionCups * 1000 + 1000);
    } catch {
      toast.error(t.liveToastFailed);
      setFeeding(false);
    }
  };

  const agoText = !updatedAt ? null
    : secondsAgo < 60 ? t.liveAgoSec(secondsAgo)
    : t.liveAgoMin(Math.floor(secondsAgo / 60));

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{t.liveKicker}</p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold text-gray-800">{t.liveTitle}</h1>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
            isOnline ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
            {isOnline ? t.liveBadgeOn : t.liveBadgeOff}
          </div>
        </div>
      </div>

      {/* Camera feed */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video relative shadow-xl">
        <AnimatePresence mode="wait">
          {imageUrl ? (
            <motion.div key="img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl} alt="Live feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="bg-black/50 text-white text-[9px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                  📷 FEEDER_CAM_01
                </span>
              </div>
              {agoText && (
                <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[9px] px-2 py-0.5 rounded-full">
                  {agoText}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="loading" className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin" />
              <p className="text-white/50 text-xs">{t.liveWaiting}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {camIp && (
          <div className="absolute bottom-2 left-2 bg-black/40 text-white/60 text-[9px] font-mono px-2 py-0.5 rounded-full">
            {camIp}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleRefresh}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-600 font-semibold text-sm shadow-sm"
        >
          <RefreshCw size={16} />
          {t.liveRefresh}
        </button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleQuickFeed}
          disabled={feeding}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm ${
            feeding ? "bg-blue-300 text-white" : "bg-blue-600 text-white shadow-lg shadow-blue-200"
          }`}
        >
          <Utensils size={16} />
          {feeding ? t.liveFeeding : t.liveQuickFeed}
        </motion.button>
      </div>

      {/* Device Health */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <p className="font-semibold text-gray-800 text-sm">{t.deviceHealth}</p>
        <div className="grid grid-cols-2 gap-4">
          {/* Storage gauge */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke="#2563eb" strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - storageUsed / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-800">{storageUsed}%</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.liveStorage}</p>
          </div>

          <div className="flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600">{t.liveWifiSignal(t.wifiStrong)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600">
                {t.liveLatency(latency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud status */}
      <div className="bg-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Cloud size={22} className="text-blue-400" />
        </div>
        <p className="font-semibold text-gray-700 text-sm">{t.liveCloudActive}</p>
        <p className="text-xs text-gray-400 text-center">{t.liveCloudSub}</p>
      </div>
    </div>
  );
}
