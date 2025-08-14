

import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Dict

# 在所有配置读取之前加载 .env 文件
load_dotenv()


class Settings(BaseModel):
    """
    应用配置模型，通过 Pydantic 自动加载和验证环境变量。
    """
    # 服务鉴权密钥（可选）
    API_KEY: str = os.getenv("API_KEY", "")

    # Dify 服务配置
    DIFY_API_URL: str = os.getenv("DIFY_API_URL")

    # Dify 各功能对应的密钥
    DIFY_API_KEYS: Dict[str, str] = {
        'parse': os.getenv("DIFY_API_KEY_PARSE"),
        'rewrite': os.getenv("DIFY_API_KEY_REWRITE"),
        'expand': os.getenv("DIFY_API_KEY_EXPAND"),
        'contract': os.getenv("DIFY_API_KEY_CONTRACT"),
        'process_text': os.getenv("DIFY_API_KEY_PROCESS_TEXT"),
        'personal_statement': os.getenv("DIFY_API_KEY_PERSONAL_STATEMENT"),
        'recommendation': os.getenv("DIFY_API_KEY_RECOMMENDATION"),
        'prompt_based': os.getenv("DIFY_API_KEY_PROMPT_BASED"),  # 新增
        'naming': os.getenv("DIFY_API_KEY_NAMING"),
    }

    # 头脑风暴服务配置
    # OpenAI配置
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    
    # SiliconFlow配置
    SILICONFLOW_API_KEY: str = os.getenv("SILICONFLOW_API_KEY", "")
    SILICONFLOW_BASE_URL: str = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
    SILICONFLOW_MODEL: str = os.getenv("SILICONFLOW_MODEL", "deepseek-ai/DeepSeek-V3")
    
    # Redis缓存配置
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_TTL: int = int(os.getenv("REDIS_TTL", "3600"))  # 1小时
    
    # 缓存配置
    SOFT_CACHE_SIZE: int = int(os.getenv("SOFT_CACHE_SIZE", "1000"))
    HARD_CACHE_TTL: int = int(os.getenv("HARD_CACHE_TTL", "86400"))  # 24小时
    
    # 用户画像配置
    USER_PROFILE_ALIGNMENT_ENABLED: bool = os.getenv("USER_PROFILE_ALIGNMENT_ENABLED", "true").lower() == "true"

    # 校验所有必要环境变量是否已设置
    def __init__(self, **data):
        super().__init__(**data)
        if not self.DIFY_API_URL or not all(self.DIFY_API_KEYS.values()):
            raise ValueError("缺少必要的环境变量，请检查 .env 文件配置。")


# 创建一个全局唯一的配置实例
settings = Settings()