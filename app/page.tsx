"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";

export default function FeederPage() {
  const [camIP, setCamIP] = useState<string>("");
  const [feeding, setFeeding] = useState(false);
  const [lastFed, setLastFed] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);

  // Firebase-аас cam_ip байнга сонсоно
  useEffect(() => {
    return onValue(ref(db, "feeder/cam_ip"), (snap) => {
      const ip = snap.val() as string | null;
      if (ip) setCamIP(ip);
    });
  }, []);

  // ESP32 command = 0 болгоход feeding товчийг reset хийнэ
  useEffect(() => {
    return onValue(ref(db, "feeder/command"), (snap) => {
      if (snap.val() === 0) setFeeding(false);
    });
  }, []);

  // Хоол өгөх товчийн handler
  const handleFeed = async () => {
    if (feeding) return;
    setFeeding(true);
    setLastFed(
      new Date().toLocaleTimeString("mn-MN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    await set(ref(db, "feeder/command"), 1);
  };

  // Камерын stream URL — API proxy дамжуулна (HTTP→HTTPS)
  const streamUrl = camIP ? `/api/stream?ip=${encodeURIComponent(camIP)}` : "";

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* ── Header ── */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest">
              PetFeeder Pro
            </p>
            <h1 className="text-2xl font-medium text-gray-100">Тэжээгч</h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                camIP ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              }`}
            />
            <span className="text-xs text-gray-500">
              {camIP ? "Онлайн" : "Холбогдж байна..."}
            </span>
          </div>
        </div>

        {/* ── Камер ── */}
        <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video relative">
          {streamUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={streamUrl}
                alt="ESP32-CAM live stream"
                className="w-full h-full object-cover"
                onError={() => console.warn("[Stream] Холболт тасарлаа")}
              />
              {/* IP badge */}
              <div className="absolute top-2 left-2 bg-black/60 rounded px-2 py-0.5">
                <span className="text-[10px] text-gray-500 font-mono">
                  {camIP}
                </span>
              </div>
              {/* LIVE badge */}
              <div className="absolute top-2 right-2 bg-red-500/15 rounded px-2 py-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-red-400">LIVE</span>
              </div>
            </>
          ) : (
            /* Камер байхгүй үед */
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <svg
                className="w-10 h-10 text-gray-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.899L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-gray-700">Камер IP хүлээж байна...</p>
              <p className="text-xs text-gray-800">
                ESP32-CAM асаагаад хэсэг хүлээнэ үү
              </p>
            </div>
          )}
        </div>

        {/* ── Мэдээлэл карт ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-[10px] text-gray-600 mb-1">Сүүлийн хоол</p>
            <p className="text-sm font-medium text-gray-300">
              {lastFed || "—"}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-[10px] text-gray-600 mb-1">Камер IP</p>
            <p className="text-sm font-medium text-green-400 font-mono truncate">
              {camIP || "—"}
            </p>
          </div>
        </div>

        {/* ── Хоол өгөх товч ── */}
        <button
          onClick={handleFeed}
          disabled={feeding}
          className={`w-full py-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            feeding
              ? "bg-indigo-900/50 text-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95"
          }`}
        >
          {feeding ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Хооллож байна...
            </>
          ) : (
            "🐾 Хоол өгөх"
          )}
        </button>

        <p className="text-center text-xs text-gray-700">
          Товч дарахад мотор 5 секунд ажиллана
        </p>
      </div>
    </main>
  );
}
