BEGIN;

-- 创建新的文档表结构，基于DocType分离
-- Resume文档表
CREATE TABLE resume_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              -- 指向 resume_document_versions.id
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- Resume版本表
CREATE TABLE resume_document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES resume_documents(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL CHECK (char_length(content) <= 5000),  -- 5k字符限制
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    checksum_sha256  TEXT,                        -- 内容校验
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

-- Letter文档表
CREATE TABLE letter_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              -- 指向 letter_document_versions.id
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- Letter版本表
CREATE TABLE letter_document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES letter_documents(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL CHECK (char_length(content) <= 5000),  -- 5k字符限制
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    checksum_sha256  TEXT,                        -- 内容校验
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

-- SOP文档表
CREATE TABLE sop_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              -- 指向 sop_document_versions.id
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- SOP版本表
CREATE TABLE sop_document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL CHECK (char_length(content) <= 5000),  -- 5k字符限制
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    checksum_sha256  TEXT,                        -- 内容校验
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

-- 添加外键约束（延迟约束避免阻塞插入）
ALTER TABLE resume_documents
ADD CONSTRAINT fk_resume_documents_current_version
FOREIGN KEY (current_version_id)
REFERENCES resume_document_versions(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE letter_documents
ADD CONSTRAINT fk_letter_documents_current_version
FOREIGN KEY (current_version_id)
REFERENCES letter_document_versions(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE sop_documents
ADD CONSTRAINT fk_sop_documents_current_version
FOREIGN KEY (current_version_id)
REFERENCES sop_document_versions(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- 创建索引（包含索引减少回表）
-- Resume索引
CREATE INDEX idx_resume_documents_user ON resume_documents(user_id);
CREATE INDEX idx_resume_documents_deleted ON resume_documents(deleted_at);
CREATE INDEX idx_resume_versions_history 
    ON resume_document_versions(document_id, created_at DESC, deleted_at) 
    INCLUDE (version_number, content_format);
CREATE UNIQUE INDEX ux_resume_versions_num
    ON resume_document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

-- Letter索引
CREATE INDEX idx_letter_documents_user ON letter_documents(user_id);
CREATE INDEX idx_letter_documents_deleted ON letter_documents(deleted_at);
CREATE INDEX idx_letter_versions_history 
    ON letter_document_versions(document_id, created_at DESC, deleted_at) 
    INCLUDE (version_number, content_format);
CREATE UNIQUE INDEX ux_letter_versions_num
    ON letter_document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

-- SOP索引
CREATE INDEX idx_sop_documents_user ON sop_documents(user_id);
CREATE INDEX idx_sop_documents_deleted ON sop_documents(deleted_at);
CREATE INDEX idx_sop_versions_history 
    ON sop_document_versions(document_id, created_at DESC, deleted_at) 
    INCLUDE (version_number, content_format);
CREATE UNIQUE INDEX ux_sop_versions_num
    ON sop_document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

-- 自动更新updated_at函数
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表创建触发器
CREATE TRIGGER trg_resume_documents_set_updated_at
    BEFORE UPDATE ON resume_documents
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_resume_versions_set_updated_at
    BEFORE UPDATE ON resume_document_versions
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_letter_documents_set_updated_at
    BEFORE UPDATE ON letter_documents
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_letter_versions_set_updated_at
    BEFORE UPDATE ON letter_document_versions
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_sop_documents_set_updated_at
    BEFORE UPDATE ON sop_documents
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_sop_versions_set_updated_at
    BEFORE UPDATE ON sop_document_versions
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();

-- 启用RLS（Row Level Security）
ALTER TABLE resume_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_document_versions ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- Resume文档策略
CREATE POLICY resume_documents_user_policy ON resume_documents
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY resume_versions_user_policy ON resume_document_versions
    FOR ALL USING (
        document_id IN (
            SELECT id FROM resume_documents 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Letter文档策略
CREATE POLICY letter_documents_user_policy ON letter_documents
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY letter_versions_user_policy ON letter_document_versions
    FOR ALL USING (
        document_id IN (
            SELECT id FROM letter_documents 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- SOP文档策略
CREATE POLICY sop_documents_user_policy ON sop_documents
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY sop_versions_user_policy ON sop_document_versions
    FOR ALL USING (
        document_id IN (
            SELECT id FROM sop_documents 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

COMMIT; 