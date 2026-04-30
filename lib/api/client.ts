const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type Schedule = {
  id: number;
  hour: number;
  minute: number;
  portionCups: number;
  label: string | null;
  enabled: boolean;
  createdAt: number;
};

export type HistoryItem = {
  id: number;
  portionCups: number;
  triggeredBy: "schedule" | "manual";
  scheduleId: number | null;
  foodLevelBefore: number | null;
  foodLevelAfter: number | null;
  createdAt: number;
};

export type StatsResponse = {
  totalCups: number;
  feedCount: number;
  avgFeedingTime: string;
  dailyData: { day: number; cups: number; count: number }[];
  recent: HistoryItem[];
};

export type DeviceStatus = {
  foodLevel: number | null;
  waterPump: boolean;
  feeding: boolean;
  lastImageUrl: string | null;
  camIp: string | null;
  updatedAt: number | null;
};

export const api = {
  feed: (portionCups: number) =>
    request<{ success: boolean; historyId: number }>("/api/feed", {
      method: "POST",
      body: JSON.stringify({ portionCups }),
    }),

  getSchedules: () => request<Schedule[]>("/api/schedules"),

  createSchedule: (data: { hour: number; minute: number; portionCups: number; label?: string }) =>
    request<Schedule>("/api/schedules", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSchedule: (id: number, data: Partial<Schedule>) =>
    request<Schedule>(`/api/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteSchedule: (id: number) =>
    request<{ success: boolean }>(`/api/schedules/${id}`, { method: "DELETE" }),

  getHistory: (limit = 20) =>
    request<HistoryItem[]>(`/api/history?limit=${limit}`),

  getStats: () => request<StatsResponse>("/api/history/stats"),

  getDeviceStatus: () => request<DeviceStatus>("/api/device/status"),

  setWaterPump: (active: boolean) =>
    request<{ success: boolean }>("/api/device/water-pump", {
      method: "POST",
      body: JSON.stringify({ active }),
    }),
};
