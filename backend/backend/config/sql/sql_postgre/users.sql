BEGIN;


CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                CITEXT NOT NULL,                                  
    password_hash        TEXT   NOT NULL CHECK (char_length(password_hash) BETWEEN 40 AND 255),
    role                 TEXT   NOT NULL DEFAULT 'user' CHECK (role IN ('guest','vvip','consultant','etc..')),
    status               SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0,1,2)),  
    --two_factor_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    --two_factor_secret    TEXT,                                             
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until         TIMESTAMPTZ,
    last_login_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,                                    
    metadata             JSONB  NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE users
    ADD COLUMN username CITEXT,                  
    ADD COLUMN refresh_token TEXT,               
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE; 


CREATE UNIQUE INDEX ux_users_username_active
    ON users (username)
    WHERE deleted_at IS NULL AND username IS NOT NULL;

CREATE UNIQUE INDEX ux_users_email_active
    ON users (email)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_users_status        ON users(status);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);


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


-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY users_self_select ON users FOR SELECT USING (id = current_setting('app.current_user_id', true)::uuid);
-- CREATE POLICY users_self_update ON users FOR UPDATE USING (id = current_setting('app.current_user_id', true)::uuid);

ALTER TABLE users RENAME COLUMN metadata TO user_metadata;
