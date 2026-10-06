ALTER TABLE attempts ADD COLUMN parent_attempt_id TEXT REFERENCES attempts(id);
