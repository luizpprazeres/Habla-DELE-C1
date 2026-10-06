CREATE TABLE profiles (
 id TEXT PRIMARY KEY CHECK(id IN ('luiz','alana')),
 name TEXT NOT NULL,
 context TEXT NOT NULL,
 weekly_blocks INTEGER NOT NULL,
 daily_minutes INTEGER NOT NULL DEFAULT 15
);
INSERT INTO profiles VALUES ('luiz','Luiz','Experiência informal e viagens. Sem certificado. Prioridade: desenvolver argumentos, textos e interações. Nível ainda não aferido.',4,15);
INSERT INTO profiles VALUES ('alana','Alana','Certificado B2, maior desenvoltura e acompanhamento com professor. Identificar lacunas para C1. Nível atual ainda não aferido.',6,15);
CREATE TABLE tasks (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 kind TEXT NOT NULL CHECK(kind IN ('reading','listening','writing','speaking')),
 title TEXT NOT NULL,
 payload TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 diagnostic INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX tasks_profile ON tasks(profile_id,created_at);
CREATE TABLE attempts (
 id TEXT PRIMARY KEY,
 task_id TEXT NOT NULL REFERENCES tasks(id),
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 answer TEXT NOT NULL,
 seconds INTEGER NOT NULL DEFAULT 0,
 audio_key TEXT,
 feedback TEXT,
 review_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX attempts_profile ON attempts(profile_id,created_at);
CREATE TABLE ai_usage (day TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0);
CREATE TABLE audio_files (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), mime TEXT NOT NULL, bytes INTEGER NOT NULL, object_key TEXT, data BLOB, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
