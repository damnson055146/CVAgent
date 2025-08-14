import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import brainstorm_router
from app.core.config import settings
from app.core.cache import init_cache

app = FastAPI(
    title="Brainstorm Agent Service",
    description="AI-powered brainstorming service with dual caching and user profile alignment",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(brainstorm_router, prefix="/api/brainstorm", tags=["brainstorm"])

@app.on_event("startup")
async def startup_event():
    """服务启动时初始化缓存"""
    await init_cache()

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "Brainstorm Agent Service"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8777,
        reload=True
    )
