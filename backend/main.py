
import uuid
from uuid import UUID
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.api.document_routes import router as document_router
from app.database import engine
from app.models import user_models, document_models

app = FastAPI(title="CV Agent API", version="1.0.0")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(document_router, prefix="/documents", tags=["documents"])

# 创建数据库表
user_models.Base.metadata.create_all(bind=engine)
document_models.Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"message": "CV Agent API is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


