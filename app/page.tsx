"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";

export default function FeederPage() {
  const [frameUrl, setFrameUrl] = useState<string>("");
  const [displayUrl, setDisplayUrl] = useState<string>("");
  const [camIP, setCamIP] = useState<string>("");
  const [feeding, setFeeding] = useState(false);
  const [lastFed, setLastFed] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // ── Firebase → frame_url шууд уншина ─────────────────────
  // ESP32-CAM upload бүрт шинэ URL бичигдэнэ
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "feeder/frame_url"), (snap) => {
      const url = snap.val() as string | null;
      if (!url) return;

      setFrameUrl(url);
      setUpdatedAt(new Date());

      // Cache bypass: Cloudinary URL-д ?cb=timestamp нэмнэ
      // Ингэснээр браузер үргэлж шинэ зураг татна
      setDisplayUrl(url + "?cb=" + Date.now());
    });
    return unsubscribe;
  }, []);

  // ── Камерын IP ────────────────────────────────────────────
  useEffect(() => {
    return onValue(ref(db, "feeder/cam_ip"), (snap) => {
      const ip = snap.val() as string | null;
      if (ip) setCamIP(ip);
    });
  }, []);

  // ── Command reset ─────────────────────────────────────────
  useEffect(() => {
    return onValue(ref(db, "feeder/command"), (snap) => {
      if (snap.val() === 0) setFeeding(false);
    });
  }, []);

  // ── "N секундын өмнө" тоолуур ────────────────────────────
  useEffect(() => {
    if (!updatedAt) return;
    const calc = () => {
      setSecondsAgo(Math.floor((Date.now() - updatedAt.getTime()) / 1000));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);

  // ── Хоол өгөх ─────────────────────────────────────────────
  const handleFeed = useCallback(async () => {
    if (feeding) return;
    setFeeding(true);
    setLastFed(
      new Date().toLocaleTimeString("mn-MN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    await set(ref(db, "feeder/command"), 1);
  }, [feeding]);

  const agoText =
    secondsAgo < 60
      ? `${secondsAgo}с өмнө`
      : `${Math.floor(secondsAgo / 60)}мин өмнө`;

  return (
    <main className="min-h-screen bg-[#f2d4cc] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {/* ── Header ── */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
              PetFeeder Pro
            </p>
            <h1 className="text-3xl font-light tracking-tight">Хооллогч</h1>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
            <span
              className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                displayUrl
                  ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                  : "bg-yellow-500 animate-pulse"
              }`}
            />
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
              {displayUrl ? "Холбогдсон" : "Хүлээж байна"}
            </span>
          </div>
        </div>

        {/* ── Камер ── */}
        <div className="bg-gray-900 rounded-3xl overflow-hidden aspect-video relative border border-gray-800 shadow-2xl">
          {displayUrl ? (
            <>
              {/*
                key=displayUrl → URL өөрчлөгдөх бүрт React DOM-д
                шинэ <img> element үүсгэнэ → браузер заавал шинэ зураг татна
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={displayUrl}
                src={displayUrl}
                alt="Камерын дүрс"
                className="w-full h-full object-cover transition-opacity duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.15";
                  console.warn("[Камер] Зураг ачаалагдсангүй:", displayUrl);
                }}
                onLoad={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "1";
                }}
              />

              {/* Дээд зүүн — LIVE + IP */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="bg-red-600/90 text-[9px] font-bold px-2 py-0.5 rounded tracking-wider animate-pulse">
                  LIVE
                </span>
                {camIP && (
                  <span className="bg-black/50 backdrop-blur-sm text-[9px] px-2 py-0.5 rounded font-mono text-gray-300">
                    {camIP}
                  </span>
                )}
              </div>

              {/* Доод баруун — шинэчлэлтийн хугацаа */}
              <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                <span className="text-[10px] text-gray-400">
                  {updatedAt ? agoText : "Cloudinary CDN"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                ESP32-CAM зураг илгээхийг хүлээж байна...
              </p>
              <p className="text-xs text-gray-700">
                Cloudinary CDN · хаанаас ч харагдана
              </p>
            </div>
          )}
        </div>

        {/* ── Мэдээлэл карт ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900/60 border border-gray-800 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              Сүүлийн хоол
            </p>
            <p className="text-lg font-medium text-gray-200">
              {lastFed || "—"}
            </p>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              Мотор
            </p>
            <p
              className={`text-lg font-medium ${
                feeding ? "text-amber-400" : "text-indigo-400"
              }`}
            >
              {feeding ? "Ажиллаж байна" : "Бэлэн"}
            </p>
          </div>
        </div>

        {/* ── Хоол өгөх товч ── */}
        <button
          onClick={handleFeed}
          disabled={feeding}
          className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-300 ${
            feeding
              ? "bg-[#ff96c5] text-gray-500 cursor-not-allowed border border-gray-700"
              : "bg-[#ff60a8] text-white hover:bg-indigo-500 active:scale-[0.98] shadow-lg shadow-indigo-900/30"
          }`}
        >
          {feeding ? (
            <span className="flex items-center justify-center gap-3">
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-20"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-80"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Мотор ажиллаж байна...
            </span>
          ) : (
            "🐾 Одоо хооллох"
          )}
        </button>

        <p className="text-center text-xs text-gray-700">
          Зураг 5 секундэд нэг шинэчлэгдэнэ · Cloudinary CDN
        </p>
      </div>
    </main>
  );
}
