-- Álbum compartilhado da jornada. Cotas (80 fotos, 25 MB) são aplicadas atomicamente no INSERT do worker.
CREATE TABLE journey_photos (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 target TEXT NOT NULL CHECK(target IN ('luiz','alana','both')),
 caption TEXT NOT NULL DEFAULT '' CHECK(length(caption) <= 280),
 mime TEXT NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp')),
 bytes INTEGER NOT NULL CHECK(bytes > 0 AND bytes <= 700000),
 data BLOB NOT NULL CHECK(length(data) = bytes),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX journey_photos_created ON journey_photos(created_at,id);
