"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type Lang = "en" | "mn";

type Dict = {
  // Common
  online: string;
  offline: string;

  // Home
  lastFeeding: (time: string) => string;
  petName: string;
  petStatus: string;
  feedNow: string;
  feeding: string;
  foodLevel: string;
  foodLevelSub: string;
  remaining: string;
  daysLeft: (days: number) => string;
  nextMeal: string;
  /** Идэвхтэй цаг алга */
  nextMealNone: string;
  /** formatted time string */
  nextMealTomorrow: (time: string) => string;
  deviceHealth: string;
  wifiStrength: string;
  wifiStrong: string;
  firmware: string;
  recentActivity: string;
  viewHistory: string;
  noActivity: string;
  manualFeed: string;
  scheduledFeed: string;
  failedSendCommand: string;
  feedingToast: (cups: number, seconds: number) => string;
  langSwitchTitle: string;

  // Bottom nav
  navHome: string;
  navSchedule: string;
  navLive: string;
  navTrends: string;

  // Schedule
  schedKicker: string;
  schedTitle: string;
  schedAddCard: string;
  schedHour: string;
  schedMinutes: string;
  schedPortionSize: string;
  cupsLabel: (label: string) => string;
  schedSaving: string;
  schedConfirm: string;
  schedDeviceLine: string;
  schedActive: string;
  schedEventsProgrammed: (n: number) => string;
  schedCupPortion: (label: string) => string;
  schedEmpty: string;
  schedToastLoadFail: string;
  schedToastAdded: string;
  schedToastAddFail: string;
  schedToastUpdateFail: string;
  schedToastDeleted: string;
  schedToastDeleteFail: string;

  // Live
  liveKicker: string;
  liveTitle: string;
  liveBadgeOn: string;
  liveBadgeOff: string;
  liveWaiting: string;
  liveAgoSec: (s: number) => string;
  liveAgoMin: (m: number) => string;
  liveRefresh: string;
  liveQuickFeed: string;
  liveFeeding: string;
  liveStorage: string;
  liveWifiSignal: (status: string) => string;
  liveLatency: (ms: number | null) => string;
  liveCloudActive: string;
  liveCloudSub: string;
  liveToastRefreshing: string;
  liveToastQuickFeed: (cups: number) => string;
  liveToastFailed: string;

  // Trends
  trendsBadge: string;
  trendsLast7: string;
  trendsWeekly1: string;
  trendsWeekly2: string;
  trendsSubtitle: string;
  trendsTotalConsumed: string;
  trendsAvgTime: string;
  trendsCups: (n: number) => string;
  trendsTankLevel: string;
  trendsLastFilled: string;
  trendsFeedNow: string;
  trendsConsumption: string;
  trendsActual: string;
  trendsConsumptionSub: string;
  trendsConsumed: string;
  trendsHistory: string;
  trendsViewAll: string;
  trendsNoHistory: string;
  trendsManualSnack: string;
  trendsScheduledMeal: string;
  trendsCupsLabel: (n: number) => string;
  dayShort: [string, string, string, string, string, string, string]; // Sun..Sat
  trendsToday: string;
  trendsYesterday: string;

  trendsSchedBlock: string;
  trendsSchedSub: string;
  trendsSchedEmpty: string;
};

const en: Dict = {
  online: "ONLINE",
  offline: "OFFLINE",

  lastFeeding: (time) => `Last feeding: Today, ${time}`,
  petName: "Lucy is",
  petStatus: "Happy",
  feedNow: "Feed Now",
  feeding: "Feeding...",
  foodLevel: "Food Level",
  foodLevelSub: "Kibble Reservoir",
  remaining: "REMAINING",
  daysLeft: (days) => `Approx. ${days} days left`,
  nextMeal: "NEXT MEAL",
  nextMealNone: "Add a feeding time in Schedule",
  nextMealTomorrow: (time) => `${time} · tomorrow`,
  deviceHealth: "Device Health",
  wifiStrength: "WiFi Strength",
  wifiStrong: "Strong",
  firmware: "Firmware",
  recentActivity: "Recent Activity",
  viewHistory: "View History",
  noActivity: "No activity yet",
  manualFeed: "Manual Feed",
  scheduledFeed: "Scheduled Feed",
  failedSendCommand: "Failed to send command",
  feedingToast: (cups, seconds) => `Feeding ${cups} cup — ${seconds}s`,
  langSwitchTitle: "Language",

  navHome: "HOME",
  navSchedule: "SCHEDULE",
  navLive: "LIVE",
  navTrends: "TRENDS",

  schedKicker: "PET NUTRITION",
  schedTitle: "Feeder Schedule",
  schedAddCard: "Add Feeding",
  schedHour: "HOUR",
  schedMinutes: "MINUTES",
  schedPortionSize: "Portion Size",
  cupsLabel: (label) => `${label} cup`,
  schedSaving: "Saving...",
  schedConfirm: "Confirm Feeding Time",
  schedDeviceLine: "SmartFeeder Pro V2 • Online",
  schedActive: "Active Schedules",
  schedEventsProgrammed: (n) => `${n} Events Programmed`,
  schedCupPortion: (label) => `${label} cup portion`,
  schedEmpty: "No schedules yet. Add one above.",
  schedToastLoadFail: "Failed to load schedules",
  schedToastAdded: "Schedule added!",
  schedToastAddFail: "Failed to add schedule",
  schedToastUpdateFail: "Failed to update",
  schedToastDeleted: "Deleted",
  schedToastDeleteFail: "Failed to delete",

  liveKicker: "KITCHEN / FEEDING STATION",
  liveTitle: "Live Camera",
  liveBadgeOn: "LIVE • 1080P",
  liveBadgeOff: "OFFLINE",
  liveWaiting: "Waiting for camera...",
  liveAgoSec: (s) => `${s}s ago`,
  liveAgoMin: (m) => `${m}min ago`,
  liveRefresh: "REFRESH / RECONNECT",
  liveQuickFeed: "QUICK FEED",
  liveFeeding: "FEEDING...",
  liveStorage: "STORAGE",
  liveWifiSignal: (status) => `Wi-Fi Signal: ${status}`,
  liveLatency: (ms) => `Latency: ${ms !== null ? `${ms}ms` : "—"}`,
  liveCloudActive: "Cloud Active",
  liveCloudSub: "Events are being recorded to your timeline",
  liveToastRefreshing: "Refreshing...",
  liveToastQuickFeed: (cups) => `Quick feed — ${cups} cup`,
  liveToastFailed: "Failed",

  trendsBadge: "INSIGHTS",
  trendsLast7: "Last 7 Days",
  trendsWeekly1: "Weekly",
  trendsWeekly2: "summary",
  trendsSubtitle:
    "Your pet's nutrition cycle is stabilizing based on the latest metrics.",
  trendsTotalConsumed: "TOTAL FOOD CONSUMED",
  trendsAvgTime: "AVERAGE FEEDING TIME",
  trendsCups: (n) => `${n} cups`,
  trendsTankLevel: "Tank Level",
  trendsLastFilled: "Last filled 2 days ago",
  trendsFeedNow: "Feed Now",
  trendsConsumption: "Consumption Trends",
  trendsActual: "Actual",
  trendsConsumptionSub: "Daily food usage in cups",
  trendsConsumed: "Consumed",
  trendsHistory: "Feeding History",
  trendsViewAll: "VIEW ALL",
  trendsNoHistory: "No history yet",
  trendsManualSnack: "Manual Snack",
  trendsScheduledMeal: "Scheduled Meal",
  trendsCupsLabel: (n) => `${n} cups`,
  dayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  trendsToday: "Today",
  trendsYesterday: "Yesterday",

  trendsSchedBlock: "Planned schedules",
  trendsSchedSub: "From Firebase schedules_app (cup size per slot)",
  trendsSchedEmpty: "No schedules yet — add under Schedule.",
};

const mn: Dict = {
  online: "ОНЛАЙН",
  offline: "ОФФЛАЙН",

  lastFeeding: (time) => `Сүүлд: Өнөөдөр, ${time}`,
  petName: "Луси",
  petStatus: "Сайн байна",
  feedNow: "Одоо хооллох",
  feeding: "Хооллож байна...",
  foodLevel: "Хоолны түвшин",
  foodLevelSub: "Хоолны савны түвшин",
  remaining: "ҮЛДСЭН",
  daysLeft: (days) => `Ойролцоогоор ${days} хоног үлдсэн`,
  nextMeal: "ДАРААГИЙН ХООЛ",
  nextMealNone: "Schedule цэсэд цаг нэмнэ үү",
  nextMealTomorrow: (time) => `${time} · маргааш`,
  deviceHealth: "Төхөөрөмжийн төлөв",
  wifiStrength: "WiFi хүч",
  wifiStrong: "Сайн",
  firmware: "Firmware",
  recentActivity: "Сүүлийн үйлдлүүд",
  viewHistory: "Түүх үзэх",
  noActivity: "Бүртгэл алга",
  manualFeed: "Гар хооллолт",
  scheduledFeed: "Тогтоосон хооллолт",
  failedSendCommand: "Команд илгээгдэхгүй байна",
  feedingToast: (cups, seconds) => `${cups} аяга хооллож байна — ${seconds}с`,
  langSwitchTitle: "Хэл",

  navHome: "НҮҮР",
  navSchedule: "ЦАГ",
  navLive: "КАМЕР",
  navTrends: "ТАЙЛАН",

  schedKicker: "ХООЛЛОЛТЫН ХУВААРЬ",
  schedTitle: "Хооллох цаг",
  schedAddCard: "Цаг нэмэх",
  schedHour: "ЦАГ",
  schedMinutes: "МИНУТ",
  schedPortionSize: "Хэмжээ",
  cupsLabel: (label) => `${label} аяга`,
  schedSaving: "Хадгалж байна...",
  schedConfirm: "Цаг хадгалах",
  schedDeviceLine: "SmartFeeder Pro V2 • Холбогдсон",
  schedActive: "Идэвхтэй цагууд",
  schedEventsProgrammed: (n) => `${n} цаг тохируулсан`,
  schedCupPortion: (label) => `${label} аяга тэжээл`,
  schedEmpty: "Цаг тохируулаагүй байна. Дээрээс нэмнэ үү.",
  schedToastLoadFail: "Цаг ачаалж чадсангүй",
  schedToastAdded: "Цаг нэмэгдлээ!",
  schedToastAddFail: "Цаг нэмэхэд алдаа гарлаа",
  schedToastUpdateFail: "Шинэчлэхэд алдаа гарлаа",
  schedToastDeleted: "Устгасан",
  schedToastDeleteFail: "Устгахад алдаа гарлаа",

  liveKicker: "ХООЛЛОХ ХЭСЭГ",
  liveTitle: "Шууд камер",
  liveBadgeOn: "ШУУД",
  liveBadgeOff: "ОФФЛАЙН",
  liveWaiting: "Камераас хүлээж байна...",
  liveAgoSec: (s) => `${s} сек өмнө`,
  liveAgoMin: (m) => `${m} мин өмнө`,
  liveRefresh: "ДАХИН ХОЛБОХ",
  liveQuickFeed: "ОДОО ХООЛЛОХ",
  liveFeeding: "ХООЛЛОЖ БАЙНА...",
  liveStorage: "САНАХ ОЙ",
  liveWifiSignal: (status) => `Wi-Fi дохио: ${status}`,
  liveLatency: (ms) => `Хоцрогдол: ${ms !== null ? `${ms}ms` : "—"}`,
  liveCloudActive: "Cloud идэвхтэй",
  liveCloudSub: "Үйлдлүүд таны түүхэнд бичигдэж байна",
  liveToastRefreshing: "Шинэчилж байна...",
  liveToastQuickFeed: (cups) => `Шуурхай тэжээл — ${cups} аяга`,
  liveToastFailed: "Алдаа гарлаа",

  trendsBadge: "ТОЙМ",
  trendsLast7: "Сүүлийн 7 хоног",
  trendsWeekly1: "7 хоногийн",
  trendsWeekly2: "тойм",
  trendsSubtitle:
    "Таны амьтны хоол хүнсний хэмнэл сүүлийн өгөгдлөөр тогтворжиж байна.",
  trendsTotalConsumed: "НИЙТ ХЭРЭГЛЭСЭН",
  trendsAvgTime: "ДУНДАЖ ХООЛЛОХ ЦАГ",
  trendsCups: (n) => `${n} аяга`,
  trendsTankLevel: "Савны түвшин",
  trendsLastFilled: "2 хоногийн өмнө дүүргэсэн",
  trendsFeedNow: "Одоо хооллох",
  trendsConsumption: "Хэрэглээний хандлага",
  trendsActual: "Бодит",
  trendsConsumptionSub: "Өдөр тутмын хэрэглээ (аягаар)",
  trendsConsumed: "Хэрэглэсэн",
  trendsHistory: "Хооллолтын түүх",
  trendsViewAll: "БҮГД ҮЗЭХ",
  trendsNoHistory: "Түүх алга",
  trendsManualSnack: "Гар хооллолт",
  trendsScheduledMeal: "Тогтоосон хооллолт",
  trendsCupsLabel: (n) => `${n} аяга`,
  dayShort: ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"],
  trendsToday: "Өнөөдөр",
  trendsYesterday: "Өчигдөр",

  trendsSchedBlock: "Тогтоосон цагууд",
  trendsSchedSub: "Firebase schedules_app (нэг суудал тутамд хэдэн аяга)",
  trendsSchedEmpty: "Цаг алга — Schedule цэсээс нэмнэ үү.",
};

const dicts: Record<Lang, Dict> = { en, mn };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
};

const LangContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: en,
});

const STORAGE_KEY = "petti.lang";

// ── Module-level external store ───────────────────────────
// useSyncExternalStore-той ашигласнаар "setState in effect" loop үүсэхгүй,
// мөн hydration mismatch гарахгүй (server bind "en", client дараа нь шилжинэ).
let cachedLang: Lang = "en";
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "mn") cachedLang = saved;
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    const v = e.newValue;
    if (v === "en" || v === "mn") {
      cachedLang = v;
      notify();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): Lang {
  return cachedLang;
}

function getServerSnapshot(): Lang {
  return "en";
}

function setLangGlobal(l: Lang) {
  if (cachedLang === l) return;
  cachedLang = l;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }
  notify();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setLang = useCallback((l: Lang) => setLangGlobal(l), []);

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t: dicts[lang] }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
