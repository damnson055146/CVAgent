BEGIN;

-- 扩展：UUID 与不区分大小写字符
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                CITEXT NOT NULL,                                   -- 邮箱（大小写不敏感）
    password_hash        TEXT   NOT NULL CHECK (char_length(password_hash) BETWEEN 40 AND 255),
    role                 TEXT   NOT NULL DEFAULT 'user' CHECK (role IN ('guest','vvip','consultant','etc..')),
    status               SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0,1,2)),  -- 0禁用 1正常 2锁定
    --two_factor_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    --two_factor_secret    TEXT,                                              -- 如用 TOTP，可加密或单独存
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until         TIMESTAMPTZ,
    last_login_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,                                       -- 软删除,留存记录
    metadata             JSONB  NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE users
    ADD COLUMN username CITEXT,                    -- 用户名（可选，大小写不敏感）
    ADD COLUMN refresh_token TEXT,                 -- 刷新令牌（如需支持）
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE; -- 是否激活（如需单独标记）

-- 如需用户名唯一约束，目前未使用
CREATE UNIQUE INDEX ux_users_username_active
    ON users (username)
    WHERE deleted_at IS NULL AND username IS NOT NULL;
-- 只对未删除用户做唯一约束
CREATE UNIQUE INDEX ux_users_email_active
    ON users (email)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_users_status        ON users(status);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

COMMIT;

-- 行级安全
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY users_self_select ON users FOR SELECT USING (id = current_setting('app.current_user_id', true)::uuid);
-- CREATE POLICY users_self_update ON users FOR UPDATE USING (id = current_setting('app.current_user_id', true)::uuid);

ALTER TABLE users RENAME COLUMN metadata TO user_metadata;
