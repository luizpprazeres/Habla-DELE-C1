-- Caderno de erros, agenda de revisão, eventos de acesso/início e plano diário opcional.
-- Itens só nascem de evidência objetiva (questão incorreta com evidência literal da fonte)
-- ou de prioridade produtiva com trecho literal da resposta. Nenhuma nota ou métrica derivada.
CREATE TABLE learning_items (
 id TEXT PRIMARY KEY, -- determinístico: <attempt_id>:<índice do item no feedback>
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 attempt_id TEXT NOT NULL REFERENCES attempts(id),
 parent_attempt_id TEXT,
 task_id TEXT NOT NULL REFERENCES tasks(id),
 kind TEXT NOT NULL CHECK(kind IN ('reading','listening','writing','speaking')),
 task_title TEXT NOT NULL,
 item_index INTEGER NOT NULL CHECK(item_index >= 0),
 origin TEXT NOT NULL CHECK(origin IN ('question','priority')),
 skill TEXT NOT NULL CHECK(skill IN ('inference','intention','attitude','detail','cohesion','grammar','idiom','writing','speaking')),
 prompt TEXT NOT NULL,
 response TEXT NOT NULL,
 expected TEXT NOT NULL,
 explanation TEXT NOT NULL,
 evidence TEXT NOT NULL DEFAULT '',
 attempt_created_at TEXT NOT NULL,
 created_at TEXT NOT NULL,
 -- Agenda simples: step indexa intervalos 1/3/7/14 dias; due_day é dia local de Maceió.
 step INTEGER NOT NULL DEFAULT 0 CHECK(step BETWEEN 0 AND 3),
 due_day TEXT NOT NULL,
 review_count INTEGER NOT NULL DEFAULT 0 CHECK(review_count >= 0),
 last_rating TEXT CHECK(last_rating IN ('again','hard','good')),
 last_reviewed_at TEXT,
 UNIQUE(attempt_id,item_index)
);
CREATE INDEX learning_items_profile_due ON learning_items(profile_id,due_day,created_at);
CREATE INDEX learning_items_profile_created ON learning_items(profile_id,attempt_created_at);

-- Autorrevisões; request_id impede que um reenvio avance a agenda duas vezes.
CREATE TABLE learning_reviews (
 request_id TEXT PRIMARY KEY,
 item_id TEXT NOT NULL REFERENCES learning_items(id),
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 rating TEXT NOT NULL CHECK(rating IN ('again','hard','good')),
 from_count INTEGER NOT NULL,
 to_step INTEGER NOT NULL CHECK(to_step BETWEEN 0 AND 3),
 to_due_day TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX learning_reviews_item ON learning_reviews(item_id,created_at);

-- Tentativas já examinadas pelo extrator (inclusive as sem item), para o backfill paginado não repetir trabalho.
CREATE TABLE learning_sync (
 attempt_id TEXT PRIMARY KEY REFERENCES attempts(id),
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 status TEXT NOT NULL CHECK(status IN ('ok','skipped')),
 items INTEGER NOT NULL DEFAULT 0,
 reason TEXT NOT NULL DEFAULT '',
 synced_at TEXT NOT NULL
);

-- Acesso e início de tarefa. Não são prática: só a tentativa enviada conta como resposta.
-- id determinístico deduplica: visit:<perfil>:<dia> e start:<perfil>:<tarefa>:<dia>.
CREATE TABLE learning_events (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 type TEXT NOT NULL CHECK(type IN ('visit','start')),
 task_id TEXT REFERENCES tasks(id),
 day TEXT NOT NULL,
 created_at TEXT NOT NULL,
 CHECK((type = 'visit' AND task_id IS NULL) OR (type = 'start' AND task_id IS NOT NULL))
);
CREATE INDEX learning_events_profile_day ON learning_events(profile_id,day);

-- Plano diário explícito e opcional: sem linha, não há plano nem "concluído".
CREATE TABLE learning_plans (
 profile_id TEXT NOT NULL REFERENCES profiles(id),
 day TEXT NOT NULL,
 target INTEGER NOT NULL CHECK(target BETWEEN 1 AND 4),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(profile_id,day)
);
