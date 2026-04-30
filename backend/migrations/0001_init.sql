CREATE TABLE IF NOT EXISTS feeding_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour INTEGER NOT NULL,
  minute INTEGER NOT NULL,
  portion_cups REAL NOT NULL,
  label TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS feeding_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portion_cups REAL NOT NULL,
  triggered_by TEXT NOT NULL CHECK(triggered_by IN ('schedule', 'manual')),
  schedule_id INTEGER,
  food_level_before REAL,
  food_level_after REAL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_level REAL,
  water_level REAL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feeding_history_created ON feeding_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_created ON sensor_readings(created_at DESC);
