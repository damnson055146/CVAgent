BEGIN;

-- id/refs 与其他两张表一致：UUID 主键，外键指向 documents / users
CREATE TABLE document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL,           -- less than 1500 words，可用 TEXT,如空留占位符
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    diff_from        UUID REFERENCES document_versions(id),  -- 可选：存差分时引用来源版本
    checksum_sha256  TEXT,                        -- 可选：内容校验
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 每个文档的版本号唯一
CREATE UNIQUE INDEX ux_doc_versions_num
    ON document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_doc_versions_doc      ON document_versions(document_id);
CREATE INDEX idx_doc_versions_created  ON document_versions(created_at);

-- 可全文检索时启用
-- ALTER TABLE document_versions ADD COLUMN content_tsv tsvector;
-- CREATE INDEX idx_doc_versions_tsv ON document_versions USING GIN (content_tsv);
-- 触发器维护 content_tsv ...

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doc_versions_set_updated_at
BEFORE UPDATE ON document_versions
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

--   回填 documents.current_version_id 外键（若尚未加）
--   ALTER TABLE documents
--   ADD CONSTRAINT fk_documents_current_version
--   FOREIGN KEY (current_version_id)
--   REFERENCES document_versions(id)
--   ON DELETE SET NULL
--   DEFERRABLE INITIALLY DEFERRED;

COMMIT;