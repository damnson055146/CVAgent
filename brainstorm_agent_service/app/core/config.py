import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # 服务配置
    SERVICE_NAME: str = "Brainstorm Agent Service"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # API配置
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Redis缓存配置
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_TTL: int = int(os.getenv("REDIS_TTL", "3600"))  # 1小时
    
    # 数据库配置
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/brainstorm_agent")
    
    # OpenAI配置
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    
    # SiliconFlow配置
    SILICONFLOW_API_KEY: str = os.getenv("SILICONFLOW_API_KEY", "")
    SILICONFLOW_BASE_URL: str = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
    SILICONFLOW_MODEL: str = os.getenv("SILICONFLOW_MODEL", "deepseek-ai/DeepSeek-V3")
    
    # 缓存配置
    SOFT_CACHE_SIZE: int = int(os.getenv("SOFT_CACHE_SIZE", "1000"))
    HARD_CACHE_TTL: int = int(os.getenv("HARD_CACHE_TTL", "86400"))  # 24小时
    
    # 用户画像配置
    USER_PROFILE_ALIGNMENT_ENABLED: bool = os.getenv("USER_PROFILE_ALIGNMENT_ENABLED", "true").lower() == "true"
    
    class Config:
        env_file = ".env"

settings = Settings()
