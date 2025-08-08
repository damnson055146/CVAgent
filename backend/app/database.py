import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv(encoding='utf-8')

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:010921@postgres:5432/aiagent")

# 创建数据库引擎
engine = create_engine(DATABASE_URL)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基础模型类
Base = declarative_base()

# 依赖注入函数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()