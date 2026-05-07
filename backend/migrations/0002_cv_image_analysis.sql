-- CV / image_model үр дүн (Cloudinary сүүлийн зураг дээрх боловсруулалт)
CREATE TABLE IF NOT EXISTS cv_image_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,
  gesture_label TEXT,
  stable_label TEXT,
  confidence REAL,
  model_version TEXT,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cv_image_analysis_created ON cv_image_analysis(created_at DESC);
