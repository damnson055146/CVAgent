import os
import time
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

load_dotenv(encoding='utf-8')

# 数据库配置
DATABASE_URL = "sqlite:///./cv_agent.db"
# DATABASE_URL = "postgresql+psycopg2://postgres:010921@127.0.0.1:5433/aiagent"
# DATABASE_URL = os.getenv(
#     "DATABASE_URL",
#     "postgresql://postgres:13689282250@localhost:5432/resumedb"
# )
# 创建数据库引擎
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基础模型类
Base = declarative_base()

# 数据库连接测试函数
def test_database_connection():
    """测试数据库连接"""
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                print(f"✅ 数据库连接成功 (尝试 {attempt + 1}/{max_retries})")
                return True
        except OperationalError as e:
            print(f"❌ 数据库连接失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print(f"⏳ {retry_delay}秒后重试...")
                time.sleep(retry_delay)
            else:
                print("❌ 数据库连接最终失败")
                return False

# 依赖注入函数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()