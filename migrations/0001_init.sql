CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categories (slug, name, sort) VALUES
  ('shabbos','Shabbos',10),
  ('yom-tov','Yomim Tovim',20),
  ('chanukah','Chanukah',30),
  ('pesach','Pesach',40),
  ('mezuzah','Mezuzah Cases',50),
  ('tzedakah','Tzedakah Boxes',60),
  ('netilas-yadayim','Netilas Yadayim',70),
  ('shul-seforim','Shul & Seforim',80),
  ('chinuch-kids','Chinuch & Kids',90),
  ('home','Home & Decor',100),
  ('tools','Tools & Workshop',110),
  ('toys-games','Toys & Games',120);

CREATE TABLE models (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_slug TEXT NOT NULL REFERENCES categories(slug),
  tags TEXT NOT NULL DEFAULT '[]',
  license TEXT NOT NULL,
  print_settings TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  reject_reason TEXT,
  cover_file_id TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX idx_models_status_published ON models(status, published_at);
CREATE INDEX idx_models_status_downloads ON models(status, downloads_count);
CREATE INDEX idx_models_user ON models(user_id);

CREATE TABLE model_files (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('model','image')),
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_model_files_model ON model_files(model_id, kind, sort);

CREATE TABLE likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, model_id)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX idx_reports_unresolved ON reports(resolved_at);

CREATE TABLE moderation_log (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('approve','reject','unpublish')),
  reason TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_moderation_log_model ON moderation_log(model_id);
