BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS api_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    api_name           TEXT NOT NULL,
    request_payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
    system_prompt      TEXT,
    model              TEXT,
    prompt_tokens      INTEGER,
    completion_tokens  INTEGER,
    total_tokens       INTEGER,
    response_text      TEXT,
    error              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_api_name ON api_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);

COMMIT;


