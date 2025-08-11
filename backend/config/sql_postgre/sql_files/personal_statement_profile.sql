BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 用于存储基于个人陈述信息生成的用户画像（Markdown 段落）
CREATE TABLE IF NOT EXISTS personal_statement_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_md  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_profiles_user_id ON personal_statement_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ps_profiles_created_at ON personal_statement_profiles(created_at);

COMMIT;


