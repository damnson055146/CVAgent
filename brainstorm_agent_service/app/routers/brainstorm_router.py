import time
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import (
    BrainstormRequest,
    BrainstormResponse,
    CacheStats,
    HealthResponse,
    ChatRequest,
    ChatResponse,
    ChatMessage,
    SessionInfo,
    SessionStats
)
from app.services.ai_client import ai_client
from app.services.conversation_manager import conversation_manager
from app.core.cache import dual_cache
from app.core.config import settings

router = APIRouter()

@router.post("/questions", response_model=BrainstormResponse)
async def generate_brainstorm_questions(request: BrainstormRequest):
    """生成头脑风暴问题"""
    start_time = time.time()
    
    try:
        # 构建缓存键
        cache_data = {
            "user_id": request.user_id,
            "cv_content": request.cv_content,
            "manual_info": request.manual_info,
            "user_profile": request.user_profile,
            "model": request.model
        }
        
        # 检查缓存
        cached_result = await dual_cache.get(cache_data)
        if cached_result:
            return BrainstormResponse(
                questions=cached_result["questions"],
                user_profile_alignment=cached_result.get("user_profile_alignment", ""),
                cache_hit=True,
                processing_time=time.time() - start_time
            )
        
        # 获取或创建会话
        session = None
        if request.user_profile or request.cv_content:
            # 如果有用户信息，创建或获取会话
            session = conversation_manager.create_session(request.user_id)
            session.update_context("user_profile", request.user_profile)
            session.update_context("cv_content", request.cv_content)
            session.update_context("manual_info", request.manual_info)
        
        # 生成问题
        questions, meta = await ai_client.generate_brainstorm_questions(
            cv_content=request.cv_content,
            manual_info=request.manual_info,
            user_profile=request.user_profile,
            model=request.model,
            session=session
        )
        
        # 用户画像对齐
        user_profile_alignment = ""
        if settings.USER_PROFILE_ALIGNMENT_ENABLED and request.user_profile:
            user_profile_alignment = await ai_client.align_with_user_profile(
                questions=questions,
                user_profile=request.user_profile,
                model=request.model
            )
        
        # 构建响应
        result = {
            "questions": questions["questions"] if isinstance(questions, dict) and "questions" in questions else questions,
            "user_profile_alignment": user_profile_alignment,
            "meta": meta
        }
        
        # 缓存结果
        await dual_cache.set(cache_data, result)
        
        processing_time = time.time() - start_time
        
        return BrainstormResponse(
            questions=result["questions"],
            user_profile_alignment=result["user_profile_alignment"],
            cache_hit=False,
            processing_time=processing_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成头脑风暴问题失败: {str(e)}")

@router.get("/cache/stats", response_model=CacheStats)
async def get_cache_stats():
    """获取缓存统计信息"""
    try:
        stats = await dual_cache.get_cache_stats()
        return CacheStats(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取缓存统计失败: {str(e)}")

@router.delete("/cache/clear")
async def clear_cache():
    """清空软缓存"""
    try:
        await dual_cache.clear_soft_cache()
        return {"message": "软缓存已清空"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空缓存失败: {str(e)}")

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    try:
        cache_stats = await dual_cache.get_cache_stats()
        return HealthResponse(
            status="healthy",
            service=settings.SERVICE_NAME,
            cache_stats=CacheStats(**cache_stats)
        )
    except Exception as e:
        return HealthResponse(
            status="unhealthy",
            service=settings.SERVICE_NAME,
            cache_stats=None
        )

@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """与AI助手进行对话"""
    start_time = time.time()
    
    try:
        # 获取或创建会话
        session = None
        if request.session_id:
            session = conversation_manager.get_session(request.session_id)
            if not session:
                raise HTTPException(status_code=404, detail="会话不存在或已过期")
        else:
            session = conversation_manager.create_session(request.user_id)
        
        # 添加用户消息到会话
        session.add_message("user", request.message)
        
        # 与AI对话
        ai_response, meta = await ai_client.chat_with_context(
            user_message=request.message,
            session=session,
            model=request.model
        )
        
        # 添加AI回复到会话
        session.add_message("assistant", ai_response, metadata=meta)
        
        # 构建响应
        conversation_history = [
            ChatMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=msg["timestamp"]
            )
            for msg in session.get_conversation_history()
        ]
        
        processing_time = time.time() - start_time
        
        return ChatResponse(
            session_id=session.session_id,
            message=ai_response,
            conversation_history=conversation_history,
            context_summary=session.get_context_summary(),
            processing_time=processing_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")

@router.get("/sessions/{user_id}", response_model=List[SessionInfo])
async def get_user_sessions(user_id: str):
    """获取用户的所有会话"""
    try:
        sessions = conversation_manager.get_user_sessions(user_id)
        session_infos = []
        
        for session in sessions:
            session_infos.append(SessionInfo(
                session_id=session.session_id,
                user_id=session.user_id,
                created_at=session.created_at.isoformat(),
                last_activity=session.last_activity.isoformat(),
                message_count=session.metadata["total_messages"],
                context_summary=session.get_context_summary()
            ))
        
        return session_infos
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")

@router.get("/sessions/{session_id}/history", response_model=List[ChatMessage])
async def get_session_history(session_id: str):
    """获取会话历史"""
    try:
        session = conversation_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在或已过期")
        
        messages = []
        for msg in session.messages:
            messages.append(ChatMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=msg["timestamp"]
            ))
        
        return messages
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话历史失败: {str(e)}")

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """删除会话"""
    try:
        session = conversation_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在或已过期")
        
        conversation_manager.delete_session(session_id)
        return {"message": "会话已删除"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除会话失败: {str(e)}")

@router.get("/sessions/stats", response_model=SessionStats)
async def get_session_stats():
    """获取会话统计信息"""
    try:
        stats = conversation_manager.get_session_stats()
        return SessionStats(**stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话统计失败: {str(e)}")
