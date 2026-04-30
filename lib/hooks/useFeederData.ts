"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export interface FoodHistoryPoint {
  time: string;
  level: number;
}

export interface FeederData {
  displayUrl: string;
  camIP: string;
  feeding: boolean;
  lastFed: string;
  updatedAt: Date | null;
  secondsAgo: number;
  foodLevel: number | null;
  waterPump: boolean;
  foodHistory: FoodHistoryPoint[];
  isOnline: boolean;
  handleFeed: () => Promise<void>;
}

export function useFeederData(): FeederData {
  const [displayUrl, setDisplayUrl] = useState("");
  const [camIP, setCamIP] = useState("");
  const [feeding, setFeeding] = useState(false);
  const [lastFed, setLastFed] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [foodLevel, setFoodLevel] = useState<number | null>(null);
  const [waterPump, setWaterPump] = useState(false);
  const [foodHistory, setFoodHistory] = useState<FoodHistoryPoint[]>([]);

  const prevUrlRef = useRef("");
  const offlineNotified = useRef(false);
  const disconnectNotified = useRef(false);

  useEffect(() => {
    return onValue(ref(db, "feeder/frame_url"), (snap) => {
      const url = snap.val() as string | null;
      if (!url) return;
      setUpdatedAt(new Date());
      setDisplayUrl(url + "?cb=" + Date.now());
      offlineNotified.current = false;
      disconnectNotified.current = false;
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "feeder/cam_ip"), (snap) => {
      const ip = snap.val() as string | null;
      if (ip) setCamIP(ip);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "feeder/command"), (snap) => {
      if (snap.val() === 0) setFeeding(false);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "feeder/food_level"), (snap) => {
      const level = snap.val() as number | null;
      if (level === null) return;
      setFoodLevel(level);
      setFoodHistory((prev) => {
        const point: FoodHistoryPoint = {
          time: new Date().toLocaleTimeString("mn-MN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          level,
        };
        return [...prev.slice(-19), point];
      });
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "feeder/water_pump"), (snap) => {
      setWaterPump(!!snap.val());
    });
  }, []);

  // Timer + offline detection
  useEffect(() => {
    if (!updatedAt) return;
    const tick = () => {
      const secs = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
      setSecondsAgo(secs);
      if (secs > 120 && !offlineNotified.current) {
        toast.error("Систем оффлайн байна", { id: "offline", duration: 5000 });
        offlineNotified.current = true;
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);

  // Camera disconnect detection
  useEffect(() => {
    const prev = prevUrlRef.current;
    if (prev && !displayUrl && !disconnectNotified.current) {
      toast.error("Камер салгагдлаа", { id: "cam-off", duration: 5000 });
      disconnectNotified.current = true;
    }
    prevUrlRef.current = displayUrl;
  }, [displayUrl]);

  const isOnline = !!updatedAt && secondsAgo < 120;

  const handleFeed = useCallback(async () => {
    if (feeding) return;
    setFeeding(true);
    setLastFed(
      new Date().toLocaleTimeString("mn-MN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    await set(ref(db, "feeder/command"), 1);
    toast.success("Хоол өгөх команд илгээлээ!", { id: "feed" });
  }, [feeding]);

  return {
    displayUrl,
    camIP,
    feeding,
    lastFed,
    updatedAt,
    secondsAgo,
    foodLevel,
    waterPump,
    foodHistory,
    isOnline,
    handleFeed,
  };
}
