BEGIN;

-- 可复用users已建的扩展：pgcrypto / citext
CREATE TYPE doc_type AS ENUM ('resume','letter','sop');

CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                doc_type NOT NULL,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              -- 指向 document_versions.id（建好versions表后再加 FK）
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- 常用索引
CREATE INDEX idx_documents_user           ON documents(user_id);
CREATE INDEX idx_documents_type           ON documents(type);
CREATE UNIQUE INDEX ux_documents_title_active
    ON documents(user_id, type, lower(title))
    WHERE deleted_at IS NULL;

-- 自动更新时间
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_set_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

--   versions表建好后再fk约束
--   ALTER TABLE documents
--   ADD CONSTRAINT fk_documents_current_version
--   FOREIGN KEY (current_version_id)
--   REFERENCES document_versions(id)
--   ON DELETE SET NULL
--   DEFERRABLE INITIALLY DEFERRED;

COMMIT;