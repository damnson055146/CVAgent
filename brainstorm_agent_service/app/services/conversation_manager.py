import json
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import deque
import uuid

class ConversationSession:
    """对话会话类"""
    
    def __init__(self, session_id: str, user_id: str, max_messages: int = 20):
        self.session_id = session_id
        self.user_id = user_id
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.messages: deque = deque(maxlen=max_messages)
        self.context: Dict[str, Any] = {
            "user_profile": "",
            "cv_content": "",
            "manual_info": {},
            "current_focus": "",
            "conversation_goals": [],
            "generated_questions": [],
            "user_responses": []
        }
        self.metadata: Dict[str, Any] = {
            "total_messages": 0,
            "total_tokens": 0,
            "session_duration": 0
        }
    
    def add_message(self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        """添加消息到会话"""
        message = {
            "id": str(uuid.uuid4()),
            "role": role,  # "user", "assistant", "system"
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        self.messages.append(message)
        self.last_activity = datetime.now()
        self.metadata["total_messages"] += 1
    
    def get_conversation_history(self, max_messages: int = 10) -> List[Dict[str, Any]]:
        """获取对话历史"""
        return list(self.messages)[-max_messages:]
    
    def update_context(self, key: str, value: Any):
        """更新上下文信息"""
        self.context[key] = value
    
    def get_context_summary(self) -> str:
        """获取上下文摘要"""
        summary_parts = []
        
        if self.context["user_profile"]:
            summary_parts.append(f"用户画像: {self.context['user_profile'][:200]}...")
        
        if self.context["cv_content"]:
            summary_parts.append(f"简历内容: {self.context['cv_content'][:200]}...")
        
        if self.context["current_focus"]:
            summary_parts.append(f"当前焦点: {self.context['current_focus']}")
        
        if self.context["conversation_goals"]:
            summary_parts.append(f"对话目标: {', '.join(self.context['conversation_goals'])}")
        
        return "\n".join(summary_parts) if summary_parts else "无上下文信息"
    
    def is_expired(self, max_duration_hours: int = 24) -> bool:
        """检查会话是否过期"""
        return datetime.now() - self.last_activity > timedelta(hours=max_duration_hours)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "messages": list(self.messages),
            "context": self.context,
            "metadata": self.metadata
        }

class ConversationManager:
    """对话管理器"""
    
    def __init__(self, max_sessions_per_user: int = 5, session_cleanup_interval: int = 3600):
        self.sessions: Dict[str, ConversationSession] = {}
        self.user_sessions: Dict[str, List[str]] = {}  # user_id -> [session_ids]
        self.max_sessions_per_user = max_sessions_per_user
        self.session_cleanup_interval = session_cleanup_interval
        self.last_cleanup = time.time()
    
    def create_session(self, user_id: str, session_id: Optional[str] = None) -> ConversationSession:
        """创建新的对话会话"""
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        # 清理过期会话
        self._cleanup_expired_sessions()
        
        # 限制用户会话数量
        if user_id in self.user_sessions:
            user_session_ids = self.user_sessions[user_id]
            if len(user_session_ids) >= self.max_sessions_per_user:
                # 删除最旧的会话
                oldest_session_id = user_session_ids[0]
                self.delete_session(oldest_session_id)
        
        # 创建新会话
        session = ConversationSession(session_id, user_id)
        self.sessions[session_id] = session
        
        # 更新用户会话列表
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = []
        self.user_sessions[user_id].append(session_id)
        
        return session
    
    def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """获取会话"""
        session = self.sessions.get(session_id)
        if session and session.is_expired():
            self.delete_session(session_id)
            return None
        return session
    
    def delete_session(self, session_id: str):
        """删除会话"""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            user_id = session.user_id
            
            # 从用户会话列表中移除
            if user_id in self.user_sessions:
                self.user_sessions[user_id] = [
                    sid for sid in self.user_sessions[user_id] 
                    if sid != session_id
                ]
            
            # 删除会话
            del self.sessions[session_id]
    
    def get_user_sessions(self, user_id: str) -> List[ConversationSession]:
        """获取用户的所有会话"""
        if user_id not in self.user_sessions:
            return []
        
        active_sessions = []
        for session_id in self.user_sessions[user_id]:
            session = self.get_session(session_id)
            if session:
                active_sessions.append(session)
            else:
                # 清理无效的会话ID
                self.user_sessions[user_id].remove(session_id)
        
        return active_sessions
    
    def _cleanup_expired_sessions(self):
        """清理过期会话"""
        current_time = time.time()
        if current_time - self.last_cleanup < self.session_cleanup_interval:
            return
        
        expired_sessions = []
        for session_id, session in self.sessions.items():
            if session.is_expired():
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            self.delete_session(session_id)
        
        self.last_cleanup = current_time
    
    def get_session_stats(self) -> Dict[str, Any]:
        """获取会话统计信息"""
        self._cleanup_expired_sessions()
        
        total_sessions = len(self.sessions)
        total_users = len(self.user_sessions)
        
        return {
            "total_sessions": total_sessions,
            "total_users": total_users,
            "max_sessions_per_user": self.max_sessions_per_user,
            "session_cleanup_interval": self.session_cleanup_interval
        }

# 全局对话管理器实例
conversation_manager = ConversationManager()
