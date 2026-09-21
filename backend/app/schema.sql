CREATE TABLE IF NOT EXISTS documents (
    id          UUID PRIMARY KEY,
    session_id  UUID        NOT NULL,
    name        TEXT        NOT NULL,
    pages       INT         NOT NULL,
    chunk_count INT         NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents (session_id);

CREATE TABLE IF NOT EXISTS messages (
    id          BIGSERIAL   PRIMARY KEY,
    session_id  UUID        NOT NULL,
    question    TEXT        NOT NULL,
    answer      TEXT        NOT NULL,
    mode        TEXT        NOT NULL,
    supported   BOOLEAN     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id);
