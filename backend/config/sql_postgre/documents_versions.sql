BEGIN;


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


CREATE UNIQUE INDEX ux_doc_versions_num
    ON document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_doc_versions_doc      ON document_versions(document_id);
CREATE INDEX idx_doc_versions_created  ON document_versions(created_at);


-- ALTER TABLE document_versions ADD COLUMN content_tsv tsvector;
-- CREATE INDEX idx_doc_versions_tsv ON document_versions USING GIN (content_tsv);



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


--   ALTER TABLE documents
--   ADD CONSTRAINT fk_documents_current_version
--   FOREIGN KEY (current_version_id)
--   REFERENCES document_versions(id)
--   ON DELETE SET NULL
--   DEFERRABLE INITIALLY DEFERRED;

COMMIT;