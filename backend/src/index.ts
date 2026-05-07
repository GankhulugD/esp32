import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { feedRoute } from "./routes/feed";
import { schedulesRoute } from "./routes/schedules";
import { historyRoute } from "./routes/history";
import { deviceRoute } from "./routes/device";
import type { Env } from "./types/env";
import { runScheduledMirror } from "./services/scheduledMirror";

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const extras = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ];
      const fromEnv = [c.env.FRONTEND_URL, ...extras].filter(Boolean) as string[];
      if (origin && fromEnv.includes(origin)) return origin;
      // Dev: Turbopack / зурвас портын localhost
      if (
        origin &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
      )
        return origin;
      return fromEnv[0] ?? "http://localhost:3000";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/api/feed", feedRoute);
app.route("/api/schedules", schedulesRoute);
app.route("/api/history", historyRoute);
app.route("/api/device", deviceRoute);

app.get("/", (c) => c.json({ status: "ok", service: "petfeeder-api" }));

/** 5 мин тутамд (UTC cron): feeder snapshot → sensor_readings */
async function scheduled(
  _event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(
    runScheduledMirror(env).catch((e) =>
      console.error("[scheduled] mirror failed", e),
    ),
  );
}

export default {
  fetch: app.fetch,
  scheduled,
};
