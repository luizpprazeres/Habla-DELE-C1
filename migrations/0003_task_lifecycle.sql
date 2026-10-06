ALTER TABLE tasks ADD COLUMN retired_at TEXT;
CREATE TABLE generated_audio (task_id TEXT PRIMARY KEY REFERENCES tasks(id), mime TEXT NOT NULL, bytes INTEGER NOT NULL, data BLOB NOT NULL);
CREATE TABLE generation_locks (profile_id TEXT PRIMARY KEY REFERENCES profiles(id), token TEXT NOT NULL, expires_at INTEGER NOT NULL);
ALTER TABLE attempts ADD COLUMN timing_source TEXT NOT NULL DEFAULT 'legacy_elapsed';
UPDATE attempts SET timing_source='self_reported' WHERE json_extract(feedback,'$.timingSource')='self_reported';
