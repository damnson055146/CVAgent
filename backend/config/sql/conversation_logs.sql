-- 对话日志表结构
-- 用于存储用户的对话历史记录

-- 创建对话会话表
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) DEFAULT 'general', -- general, document_edit, tool_usage 等
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    session_metadata JSONB DEFAULT '{}'::jsonb -- 存储会话的元数据信息
);

-- 创建对话消息表
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- user, assistant, system, tool
    tool_name VARCHAR(100) NULL, -- 如果是工具消息，记录工具名称
    tool_params JSONB NULL, -- 工具参数
    tool_result JSONB NULL, -- 工具执行结果
    tokens_used INTEGER DEFAULT 0, -- 使用的token数量
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_created_at ON conversation_sessions(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages(session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id) WHERE deleted_at IS NULL;

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS ux_conversation_sessions_user_name ON conversation_sessions(user_id, session_name) WHERE deleted_at IS NULL;

-- 创建触发器函数
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_set_updated_at_conversation_sessions
    BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 启用行级安全
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
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

-- 创建视图（可选，用于简化查询）
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