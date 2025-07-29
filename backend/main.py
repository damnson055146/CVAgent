
import uuid
from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes

app = FastAPI(
    title="CV Agent Backend API",
    description="一个结构清晰、模块化的API服务，提供简历处理和个人陈述生成服务。"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)


@app.get("/", tags=["Health Check"])
def read_root():
    """
    根路径健康检查接口。
    """
    return {"status": "ok", "message": "CV Agent API服务已成功启动！"}


