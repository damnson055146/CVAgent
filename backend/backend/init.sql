-- 启用必要的扩展
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ========================================
-- 1. 用户表 (users)
-- ========================================
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

-- 用户表索引
CREATE UNIQUE INDEX ux_users_username_active
    ON users (username)
    WHERE deleted_at IS NULL AND username IS NOT NULL;

CREATE UNIQUE INDEX ux_users_email_active
    ON users (email)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_users_status        ON users(status);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

-- ========================================
-- 2. Resume文档表 (resume_documents)
-- ========================================
CREATE TABLE resume_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- Resume版本表
CREATE TABLE resume_document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES resume_documents(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL CHECK (char_length(content) <= 5000),
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    checksum_sha256  TEXT,                        
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

-- Resume索引
CREATE INDEX idx_resume_documents_user ON resume_documents(user_id);
CREATE INDEX idx_resume_documents_deleted ON resume_documents(deleted_at);
CREATE INDEX idx_resume_versions_history 
    ON resume_document_versions(document_id, created_at DESC, deleted_at) 
    INCLUDE (version_number, content_format);
CREATE UNIQUE INDEX ux_resume_versions_num
    ON resume_document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

-- ========================================
-- 3. Letter文档表 (letter_documents)
-- ========================================
CREATE TABLE letter_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- Letter版本表
CREATE TABLE letter_document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES letter_documents(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL CHECK (char_length(content) <= 5000),
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    checksum_sha256  TEXT,                        
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

-- Letter索引
CREATE INDEX idx_letter_documents_user ON letter_documents(user_id);
CREATE INDEX idx_letter_documents_deleted ON letter_documents(deleted_at);
CREATE INDEX idx_letter_versions_history 
    ON letter_document_versions(document_id, created_at DESC, deleted_at) 
    INCLUDE (version_number, content_format);
CREATE UNIQUE INDEX ux_letter_versions_num
    ON letter_document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

-- ========================================
-- 4. SOP文档表 (sop_documents)
-- ========================================
CREATE TABLE sop_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL DEFAULT '',
    current_version_id  UUID,                              
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- SOP版本表
CREATE TABLE sop_document_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    version_number   INTEGER NOT NULL,
    content          TEXT   NOT NULL CHECK (char_length(content) <= 5000),
    content_format   TEXT   NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown','html','plain')),
    checksum_sha256  TEXT,                        
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

-- SOP索引
CREATE INDEX idx_sop_documents_user ON sop_documents(user_id);
CREATE INDEX idx_sop_documents_deleted ON sop_documents(deleted_at);
CREATE INDEX idx_sop_versions_history 
    ON sop_document_versions(document_id, created_at DESC, deleted_at) 
    INCLUDE (version_number, content_format);
CREATE UNIQUE INDEX ux_sop_versions_num
    ON sop_document_versions(document_id, version_number)
    WHERE deleted_at IS NULL;

-- ========================================
-- 5. 对话日志表 (conversation_logs)
-- ========================================
-- 创建对话会话表
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    session_metadata JSONB DEFAULT '{}'::jsonb
);

-- 创建对话消息表
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    tool_name VARCHAR(100) NULL,
    tool_params JSONB NULL,
    tool_result JSONB NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- 对话日志索引
CREATE INDEX idx_conversation_sessions_user_id ON conversation_sessions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversation_sessions_created_at ON conversation_sessions(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversation_messages_session_id ON conversation_messages(session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversation_messages_created_at ON conversation_messages(created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversation_messages_user_id ON conversation_messages(user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_conversation_sessions_user_name ON conversation_sessions(user_id, session_name) WHERE deleted_at IS NULL;

-- ========================================
-- 外键约束
-- ========================================
-- Resume文档外键约束
ALTER TABLE resume_documents 
ADD CONSTRAINT fk_resume_documents_current_version
FOREIGN KEY (current_version_id) REFERENCES resume_document_versions(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- Letter文档外键约束
ALTER TABLE letter_documents 
ADD CONSTRAINT fk_letter_documents_current_version
FOREIGN KEY (current_version_id) REFERENCES letter_document_versions(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- SOP文档外键约束
ALTER TABLE sop_documents 
ADD CONSTRAINT fk_sop_documents_current_version
FOREIGN KEY (current_version_id) REFERENCES sop_document_versions(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- ========================================
-- 触发器函数和触发器
-- ========================================
-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表创建触发器
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

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

CREATE TRIGGER trigger_set_updated_at_conversation_sessions
    BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ========================================
-- 行级安全策略
-- ========================================
-- 启用RLS
ALTER TABLE resume_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY resume_documents_user_policy ON resume_documents
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY resume_versions_user_policy ON resume_document_versions
    FOR ALL USING (
        document_id IN (
            SELECT id FROM resume_documents 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

CREATE POLICY letter_documents_user_policy ON letter_documents
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY letter_versions_user_policy ON letter_document_versions
    FOR ALL USING (
        document_id IN (
            SELECT id FROM letter_documents 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

CREATE POLICY sop_documents_user_policy ON sop_documents
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY sop_versions_user_policy ON sop_document_versions
    FOR ALL USING (
        document_id IN (
            SELECT id FROM sop_documents 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- 对话日志策略
CREATE POLICY "Users can view their own conversation sessions" ON conversation_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own conversation sessions" ON conversation_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own conversation sessions" ON conversation_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own conversation sessions" ON conversation_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own conversation messages" ON conversation_messages
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own conversation messages" ON conversation_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own conversation messages" ON conversation_messages
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own conversation messages" ON conversation_messages
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- ========================================
-- 创建视图
-- ========================================
-- 对话摘要视图
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
    cs.id as session_id,
    cs.session_name,
    cs.session_type,
    cs.created_at as session_created_at,
    cs.updated_at as session_updated_at,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at
FROM conversation_sessions cs
LEFT JOIN conversation_messages cm ON cs.id = cm.session_id AND cm.deleted_at IS NULL
WHERE cs.deleted_at IS NULL
GROUP BY cs.id, cs.session_name, cs.session_type, cs.created_at, cs.updated_at; 