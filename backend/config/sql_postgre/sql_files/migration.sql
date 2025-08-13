BEGIN;

-- Temporarily disable triggers on documents change the enum type
ALTER TABLE documents
  DISABLE TRIGGER ALL;

-- Create the new enum type
CREATE TYPE doc_type_new AS ENUM (
  'resume',
  'personal_statement',
  'recommendation'
);

-- Convert the existing column to TEXT update values
ALTER TABLE documents
  ALTER COLUMN type DROP DEFAULT,
  ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- Migrate old enum values to the new ones
UPDATE documents
SET type = CASE type
  WHEN 'letter' THEN 'recommendation'
  WHEN 'sop'    THEN 'personal_statement'
  ELSE type
END;

-- Convert the column to the new enum type
ALTER TABLE documents
  ALTER COLUMN type TYPE doc_type_new
    USING type::doc_type_new;

-- Set a new default
ALTER TABLE documents
  ALTER COLUMN type SET DEFAULT 'resume'::doc_type_new;

-- Drop the old enum type and rename the new one
DROP TYPE doc_type;
ALTER TYPE doc_type_new
  RENAME TO doc_type;

-- Re-enable triggers
ALTER TABLE documents
  ENABLE TRIGGER ALL;

-- document_versions → documents FK: cascade on delete
ALTER TABLE document_versions
  DROP CONSTRAINT IF EXISTS document_versions_document_id_fkey;
ALTER TABLE document_versions
  ADD CONSTRAINT document_versions_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES documents(id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED;

-- documents → document_versions FK: set null on delete
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_current_version_id_fkey;
ALTER TABLE documents
  ADD CONSTRAINT documents_current_version_id_fkey
    FOREIGN KEY (current_version_id) REFERENCES document_versions(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- Add a content length check
ALTER TABLE document_versions
  ADD CONSTRAINT chk_content_len
    CHECK (char_length(content) <= 5000);

-- Enable RLS on documents and define owner policy
ALTER TABLE documents
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_owner_policy
  ON documents FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Enable RLS on document_versions and define owner policy
ALTER TABLE document_versions
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY doc_versions_owner_policy
  ON document_versions FOR ALL
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Drop unique index on (user_id, type, lower(title)) to allow duplicate titles for active documents
DROP INDEX IF EXISTS ux_documents_title_active;

COMMIT;