-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 创建用户表
CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                CITEXT NOT NULL,                                  
    password_hash        TEXT   NOT NULL CHECK (char_length(password_hash) BETWEEN 40 AND 255),
    role                 TEXT   NOT NULL DEFAULT 'user' CHECK (role IN ('guest','vvip','consultant','etc..')),
    status               SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0,1,2)),  
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until         TIMESTAMPTZ,
    last_login_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,                                    
    user_metadata        JSONB  NOT NULL DEFAULT '{}'::jsonb,
    username             CITEXT,                  
    refresh_token        TEXT,               
    is_active            BOOLEAN NOT NULL DEFAULT TRUE
);

-- 创建文档类型枚举
CREATE TYPE doc_type AS ENUM ('resume','personal_statement','recommendation');

-- 创建文档表
CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                doc_type NOT NULL,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- 创建文档版本表
CREATE TABLE document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL,           
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    diff_from        UUID REFERENCES document_versions(id),  
    checksum_sha256  TEXT,                        
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 创建索引
CREATE UNIQUE INDEX ux_users_username_active
    ON users (username)
    WHERE deleted_at IS NULL AND username IS NOT NULL;

CREATE UNIQUE INDEX ux_users_email_active
    ON users (email)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_users_status        ON users(status);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

CREATE INDEX idx_documents_user           ON documents(user_id);
CREATE INDEX idx_documents_type           ON documents(type);
CREATE UNIQUE INDEX ux_documents_title_active
    ON documents(user_id, type, lower(title))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX ux_doc_versions_num
    ON document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_doc_versions_doc      ON document_versions(document_id);
CREATE INDEX idx_doc_versions_created  ON document_versions(created_at);

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_documents_set_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_doc_versions_set_updated_at
BEFORE UPDATE ON document_versions
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- 添加外键约束
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES document_versions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- 添加内容长度检查
ALTER TABLE document_versions
  ADD CONSTRAINT chk_content_len
    CHECK (char_length(content) <= 5000);