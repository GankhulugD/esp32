import {
  sqliteTable,
  integer,
  real,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Тэжээлийн хуваарь
export const feedingSchedules = sqliteTable(
  "feeding_schedules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hour: integer("hour").notNull(),           // 0-23
    minute: integer("minute").notNull(),       // 0-59
    portionCups: real("portion_cups").notNull(), // 0.25, 0.5, 0.75, 1.0 ...
    label: text("label"),                      // "Morning Meal", "Evening Meal" etc
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Math.floor(Date.now() / 1000)),
    /** RTDB `feeder/schedules_app/{pushId}` түлхүүр — D1 шинэчилж sync хийнэ */
    firebaseKey: text("firebase_key"),
  },
  (t) => [uniqueIndex("idx_feeding_schedules_firebase_key").on(t.firebaseKey)],
);

// Тэжээлийн түүх (log)
export const feedingHistory = sqliteTable("feeding_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  portionCups: real("portion_cups").notNull(),
  triggeredBy: text("triggered_by", { enum: ["schedule", "manual"] }).notNull(),
  scheduleId: integer("schedule_id"),        // D1 feeding_schedules.id
  /** Firebase schedule push id (ESP32 / ScheduleRunner) */
  scheduleFirebaseKey: text("schedule_firebase_key"),
  foodLevelBefore: real("food_level_before"),
  foodLevelAfter: real("food_level_after"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// Sensor уншилтын түүх (ultrasonic → food/water level)
export const sensorReadings = sqliteTable("sensor_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  foodLevel: real("food_level"),   // 0-100%
  waterLevel: real("water_level"), // 0-100%
  createdAt: integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

export type FeedingSchedule = typeof feedingSchedules.$inferSelect;
export type NewFeedingSchedule = typeof feedingSchedules.$inferInsert;
export type FeedingHistory = typeof feedingHistory.$inferSelect;
export type SensorReading = typeof sensorReadings.$inferSelect;
