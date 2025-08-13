import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

load_dotenv(encoding='utf-8')

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:010921@postgres:5432/aiagent")

# 同步引擎（用于元数据创建等同步场景）
engine = create_engine(DATABASE_URL)

# 推导/读取异步连接串
ASYNC_DATABASE_URL = os.getenv("DATABASE_URL_ASYNC")
if not ASYNC_DATABASE_URL:
    # 将 psycopg2 驱动替换为 asyncpg；若未指明驱动，使用 postgresql+asyncpg
    if "+psycopg2" in DATABASE_URL:
        ASYNC_DATABASE_URL = DATABASE_URL.replace("+psycopg2", "+asyncpg")
    elif DATABASE_URL.startswith("postgresql://"):
        ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        # 兜底：直接沿用，若非法将于启动时报错
        ASYNC_DATABASE_URL = DATABASE_URL

# 异步引擎与会话工厂
async_engine = create_async_engine(ASYNC_DATABASE_URL, future=True)
AsyncSessionLocal = sessionmaker(bind=async_engine, expire_on_commit=False, class_=AsyncSession, autoflush=False, autocommit=False)

# 创建基础模型类
Base = declarative_base()

# 依赖注入函数（异步会话）
async def get_db():
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()