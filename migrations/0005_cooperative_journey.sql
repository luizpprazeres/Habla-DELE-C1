CREATE TABLE journey_celebrations (
 id TEXT PRIMARY KEY,
 from_profile TEXT NOT NULL REFERENCES profiles(id),
 to_profile TEXT NOT NULL REFERENCES profiles(id),
 milestone_id TEXT NOT NULL CHECK(milestone_id IN ('first-step','two-skills','four-skills','first-revision','first-dialogue')),
 message_id TEXT NOT NULL CHECK(message_id IN ('effort','revision','together')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(from_profile <> to_profile),
 UNIQUE(from_profile,to_profile,milestone_id)
);
CREATE INDEX journey_celebrations_target ON journey_celebrations(to_profile,created_at);
