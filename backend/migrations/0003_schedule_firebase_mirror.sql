-- Schedule-уудыг Firebase schedules_app-тай зэрэгцүүлэх (firebase_key upsert)
ALTER TABLE feeding_schedules ADD COLUMN firebase_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feeding_schedules_firebase_key
  ON feeding_schedules(firebase_key);

-- Manual / web schedule fallback-ийн түүх
ALTER TABLE feeding_history ADD COLUMN schedule_firebase_key TEXT;
