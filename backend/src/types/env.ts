/** Wrangler bindings (wrangler.toml + .dev.vars / secrets) */
export type Env = {
  DB: D1Database;
  FIREBASE_DB_URL: string;
  FIREBASE_SECRET: string;
  FRONTEND_URL: string;
};
