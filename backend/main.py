
import uuid
from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.api.document_routes import router as document_router
from app.database import engine, test_database_connection
from app.models import user_models, document_models

# 测试数据库连接
print("🔍 测试数据库连接...")
if test_database_connection():
    # 创建数据库表
    print("📦 创建数据库表...")
    user_models.Base.metadata.create_all(bind=engine)
    document_models.Base.metadata.create_all(bind=engine)
    print("✅ 数据库表创建完成")
else:
    print("⚠️ 数据库连接失败，应用将在有限功能模式下运行")

app = FastAPI(
    title="CV Agent Backend API",
    description="一个结构清晰、模块化的API服务，提供简历处理和个人陈述生成服务。"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(document_router, prefix="/documents", tags=["documents"])

@app.get("/", tags=["Health Check"])
def read_root():
    """
    根路径健康检查接口。
    """
    return {"status": "ok", "message": "CV Agent API服务已成功启动！"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


