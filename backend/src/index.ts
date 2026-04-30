import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { feedRoute } from "./routes/feed";
import { schedulesRoute } from "./routes/schedules";
import { historyRoute } from "./routes/history";
import { deviceRoute } from "./routes/device";

type Env = {
  DB: D1Database;
  FIREBASE_DB_URL: string;
  FIREBASE_SECRET: string;
  FRONTEND_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const allowed = [
        c.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
      ];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.route("/api/feed", feedRoute);
app.route("/api/schedules", schedulesRoute);
app.route("/api/history", historyRoute);
app.route("/api/device", deviceRoute);

app.get("/", (c) => c.json({ status: "ok", service: "petfeeder-api" }));

export default app;
