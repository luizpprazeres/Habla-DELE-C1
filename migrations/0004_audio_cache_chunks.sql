ALTER TABLE generated_audio ADD COLUMN cache_token TEXT NOT NULL DEFAULT '';
CREATE TABLE generated_audio_chunks (task_id TEXT NOT NULL REFERENCES generated_audio(task_id), cache_token TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(task_id, cache_token, part));
