from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class BrainstormCategory(str, Enum):
    """头脑风暴问题类别"""
    ACADEMIC = "academic"
    RESEARCH = "research"
    LEADERSHIP = "leadership"
    PERSONAL = "personal"
    CAREER = "career"
    MOTIVATION = "motivation"

class BrainstormRequest(BaseModel):
    """头脑风暴请求模型"""
    user_id: str = Field(..., description="用户ID")
    cv_content: Optional[str] = Field("", description="简历内容")
    manual_info: Optional[Dict[str, Any]] = Field({}, description="手动输入的信息")
    prompt_template: Optional[str] = Field("", description="自定义提示模板")
    model: str = Field("deepseek-ai/DeepSeek-V3", description="使用的模型")
    selected_text: Optional[str] = Field("", description="选中的文本")
    user_profile: Optional[str] = Field("", description="用户画像信息")

class BrainstormQuestion(BaseModel):
    """头脑风暴问题模型"""
    question: str = Field(..., description="问题内容")
    category: BrainstormCategory = Field(..., description="问题类别")
    priority: int = Field(1, description="优先级（1-5）")
    context: Optional[str] = Field("", description="问题上下文")

class BrainstormResponse(BaseModel):
    """头脑风暴响应模型"""
    questions: List[Dict[str, List[BrainstormQuestion]]] = Field(..., description="按类别分组的问题")
    user_profile_alignment: Optional[str] = Field("", description="用户画像对齐信息")
    cache_hit: bool = Field(False, description="是否命中缓存")
    processing_time: float = Field(..., description="处理时间（秒）")

class UserProfileAlignment(BaseModel):
    """用户画像对齐模型"""
    user_id: str = Field(..., description="用户ID")
    profile_content: str = Field(..., description="用户画像内容")
    alignment_score: float = Field(..., description="对齐分数")
    alignment_notes: Optional[str] = Field("", description="对齐说明")

class CacheStats(BaseModel):
    """缓存统计模型"""
    soft_cache_size: int = Field(..., description="软缓存大小")
    soft_cache_max_size: int = Field(..., description="软缓存最大大小")
    redis_connected: bool = Field(..., description="Redis连接状态")
    redis_info: Optional[Dict[str, Any]] = Field(None, description="Redis信息")

class HealthResponse(BaseModel):
    """健康检查响应模型"""
    status: str = Field(..., description="服务状态")
    service: str = Field(..., description="服务名称")
    cache_stats: Optional[CacheStats] = Field(None, description="缓存统计")

class ChatMessage(BaseModel):
    """聊天消息模型"""
    role: str = Field(..., description="消息角色: user, assistant, system")
    content: str = Field(..., description="消息内容")
    timestamp: Optional[str] = Field(None, description="时间戳")

class ChatRequest(BaseModel):
    """聊天请求模型"""
    user_id: str = Field(..., description="用户ID")
    session_id: Optional[str] = Field(None, description="会话ID，不提供则创建新会话")
    message: str = Field(..., description="用户消息")
    model: str = Field("deepseek-ai/DeepSeek-V3", description="使用的模型")

class ChatResponse(BaseModel):
    """聊天响应模型"""
    session_id: str = Field(..., description="会话ID")
    message: str = Field(..., description="AI回复内容")
    conversation_history: List[ChatMessage] = Field(..., description="对话历史")
    context_summary: str = Field(..., description="上下文摘要")
    processing_time: float = Field(..., description="处理时间（秒）")

class SessionInfo(BaseModel):
    """会话信息模型"""
    session_id: str = Field(..., description="会话ID")
    user_id: str = Field(..., description="用户ID")
    created_at: str = Field(..., description="创建时间")
    last_activity: str = Field(..., description="最后活动时间")
    message_count: int = Field(..., description="消息数量")
    context_summary: str = Field(..., description="上下文摘要")

class SessionStats(BaseModel):
    """会话统计模型"""
    total_sessions: int = Field(..., description="总会话数")
    total_users: int = Field(..., description="总用户数")
    max_sessions_per_user: int = Field(..., description="每用户最大会话数")
    session_cleanup_interval: int = Field(..., description="会话清理间隔")
