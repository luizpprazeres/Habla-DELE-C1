CREATE TABLE speech_locks(task_id TEXT PRIMARY KEY REFERENCES tasks(id),token TEXT NOT NULL,expires_at INTEGER NOT NULL);
